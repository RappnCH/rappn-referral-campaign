import os
import secrets
import time
import json
import base64
import hashlib
import hmac
import ipaddress
import httpx
import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Carica le variabili dal file .env (utile solo per i test in locale)
load_dotenv()

app = FastAPI()

allowed_origins = [
    origin.strip()
    for origin in os.getenv("DASHBOARD_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL di destinazione per il download
DOWNLOAD_URL = "https://rappn.ch/api/download"

# Variabile globale per il pool di connessioni al DB
db_pool = None
admin_token = None
ambassador_auth_secret = None

AMBASSADOR_TOKEN_TTL_SECONDS = 60 * 60 * 12


class AmbassadorCreate(BaseModel):
    referral_code: str = Field(min_length=2, max_length=50)
    name: str | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AmbassadorPasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class AmbassadorLoginRequest(BaseModel):
    referral_code: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class TrackClickRequest(BaseModel):
    ip: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None


def hash_password(password: str) -> str:
    iterations = 210000
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt}${password_hash.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False

    try:
        algorithm, iterations_str, salt, expected_hash = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False

        iterations = int(iterations_str)
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            iterations,
        ).hex()
        return secrets.compare_digest(computed, expected_hash)
    except Exception:
        return False


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def b64url_decode(raw: str) -> bytes:
    padded = raw + "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(padded)


def create_ambassador_token(referral_code: str) -> str:
    if not ambassador_auth_secret:
        raise HTTPException(status_code=500, detail="AMBASSADOR_AUTH_SECRET non configurato")

    payload = {
        "ref": referral_code,
        "exp": int(time.time()) + AMBASSADOR_TOKEN_TTL_SECONDS,
    }
    payload_b64 = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        ambassador_auth_secret.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_ambassador_token(token: str) -> str | None:
    if not ambassador_auth_secret:
        return None

    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        ambassador_auth_secret.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not secrets.compare_digest(signature, expected_signature):
        return None

    try:
        payload = json.loads(b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        return None

    referral_code = payload.get("ref")
    expires_at = payload.get("exp")

    if not isinstance(referral_code, str) or not isinstance(expires_at, int):
        return None

    if expires_at < int(time.time()):
        return None

    return referral_code


def get_authorization_bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    prefix = "Bearer "
    if not header.startswith(prefix):
        raise HTTPException(status_code=401, detail="Token mancante")
    return header[len(prefix):].strip()


def require_ambassador(request: Request) -> str:
    token = get_authorization_bearer(request)
    referral_code = verify_ambassador_token(token)
    if not referral_code:
        raise HTTPException(status_code=401, detail="Token non valido")
    return referral_code


def mask_ip(ip_address: str | None) -> str:
    if not ip_address:
        return "-"

    if ":" in ip_address:
        blocks = ip_address.split(":")
        return ":".join(blocks[:3]) + ":*"

    blocks = ip_address.split(".")
    if len(blocks) == 4:
        return f"{blocks[0]}.{blocks[1]}.{blocks[2]}.*"

    return "*"


def require_admin(request: Request):
    if not admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN non configurato")

    provided = request.headers.get("x-admin-token", "")
    if not secrets.compare_digest(provided, admin_token):
        raise HTTPException(status_code=401, detail="Unauthorized")


def resolve_client_ip(request: Request, ip_override: str | None = None) -> str:
    candidates = [
        ip_override,
        request.headers.get("x-client-ip"),
        request.headers.get("x-real-ip"),
        request.headers.get("x-forwarded-for", "").split(",")[0].strip() if request.headers.get("x-forwarded-for") else None,
        request.client.host if request.client else None,
    ]

    for candidate in candidates:
        if not candidate:
            continue
        value = candidate.strip()
        if value in ("localhost", "127.0.0.1", "::1"):
            return value
        try:
            ipaddress.ip_address(value)
            return value
        except ValueError:
            continue

    return "127.0.0.1"


async def track_click(referral_code: str, ip_address: str, user_agent: str) -> str:
    try:
        async with db_pool.acquire() as connection:
            ambassador_exists = await connection.fetchval(
                "SELECT 1 FROM ambassador WHERE referral_code = $1",
                referral_code,
            )

            if not ambassador_exists:
                return "ambassador_not_found"

            already_clicked = await connection.fetchval(
                "SELECT 1 FROM click WHERE referral_code = $1 AND ip_address = $2",
                referral_code,
                ip_address,
            )

            if already_clicked:
                return "duplicate"

            is_swiss = await check_is_swiss(ip_address)
            result = await connection.execute(
                """
                INSERT INTO click (referral_code, ip_address, is_swiss, user_agent)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (referral_code, ip_address) DO NOTHING
                """,
                referral_code,
                ip_address,
                is_swiss,
                user_agent,
            )

            if result == "INSERT 0 0":
                return "duplicate"

            return "tracked"
    except Exception as e:
        print(f"Errore durante il salvataggio nel database: {e}")
        return "error"

@app.on_event("startup")
async def startup():
    global db_pool, admin_token, ambassador_auth_secret
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("La variabile d'ambiente DATABASE_URL non è impostata!")

    admin_token = os.getenv("ADMIN_TOKEN", "").strip()
    if not admin_token:
        raise ValueError("La variabile d'ambiente ADMIN_TOKEN non è impostata!")

    ambassador_auth_secret = os.getenv("AMBASSADOR_AUTH_SECRET", "").strip()
    if not ambassador_auth_secret:
        raise ValueError("La variabile d'ambiente AMBASSADOR_AUTH_SECRET non è impostata!")
    
    # Crea un pool di connessioni al database PostgreSQL
    db_pool = await asyncpg.create_pool(database_url)

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()

async def check_is_swiss(ip: str) -> bool:
    """Usa un'API gratuita per verificare se l'IP è in Svizzera (CH)."""
    # Ignora gli IP locali durante i test
    if ip in ("127.0.0.1", "::1", "localhost"):
        return False
        
    try:
        # httpx è come 'requests', ma asincrono (non blocca il server)
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip}", timeout=2.0)
            data = response.json()
            return data.get("countryCode") == "CH"
    except Exception as e:
        print(f"Errore geolocalizzazione IP: {e}")
        return False

@app.get("/ref/{referral_code}")
@app.get("/api/download/ref/{referral_code}")
async def track_and_redirect(referral_code: str, request: Request):
    ip_address = resolve_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    await track_click(referral_code, ip_address, user_agent)

    return RedirectResponse(url=DOWNLOAD_URL, status_code=302)


@app.get("/api/track/{referral_code}")
async def track_only_get(referral_code: str, request: Request):
    ip_address = resolve_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    status = await track_click(referral_code, ip_address, user_agent)

    return {
        "ok": status in ("tracked", "duplicate"),
        "status": status,
        "referral_code": referral_code,
    }


@app.post("/api/track/{referral_code}")
async def track_only_post(referral_code: str, request: Request, payload: TrackClickRequest | None = None):
    ip_override = (payload.ip if payload and payload.ip else payload.ip_address) if payload else None
    ua_override = payload.user_agent if payload else None

    ip_address = resolve_client_ip(request, ip_override=ip_override)
    user_agent = ua_override.strip() if ua_override else request.headers.get("user-agent", "")
    status = await track_click(referral_code, ip_address, user_agent)

    return {
        "ok": status in ("tracked", "duplicate"),
        "status": status,
        "referral_code": referral_code,
    }

# Un endpoint di base per verificare che il server sia online
@app.get("/")
async def root():
    return {"status": "online", "service": "Tracking Server"}


@app.get("/api/ambassadors", dependencies=[Depends(require_admin)])
async def list_ambassadors():
    async with db_pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                a.id,
                a.referral_code,
                a.name,
                a.created_at,
                COUNT(c.id)::int AS total_clicks,
                COUNT(*) FILTER (WHERE c.is_swiss = TRUE)::int AS swiss_clicks
            FROM ambassador a
            LEFT JOIN click c ON c.referral_code = a.referral_code
            GROUP BY a.id, a.referral_code, a.name, a.created_at
            ORDER BY a.created_at DESC
            """
        )

    return [dict(row) for row in rows]


@app.post("/api/ambassadors", dependencies=[Depends(require_admin)])
async def create_ambassador(payload: AmbassadorCreate):
    referral_code = payload.referral_code.strip().lower()
    if not referral_code:
        raise HTTPException(status_code=400, detail="Referral code obbligatorio")

    name = payload.name.strip() if payload.name else None
    password_hash = hash_password(payload.password) if payload.password else None

    try:
        async with db_pool.acquire() as connection:
            row = await connection.fetchrow(
                """
                INSERT INTO ambassador (referral_code, name, password_hash)
                VALUES ($1, $2, $3)
                RETURNING id, referral_code, name, created_at
                """,
                referral_code,
                name,
                password_hash,
            )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Referral code già esistente")

    return {**dict(row), "total_clicks": 0, "swiss_clicks": 0}


@app.post("/api/ambassadors/{referral_code}/password", dependencies=[Depends(require_admin)])
async def set_ambassador_password(referral_code: str, payload: AmbassadorPasswordUpdate):
    new_hash = hash_password(payload.password)

    async with db_pool.acquire() as connection:
        updated = await connection.fetchval(
            """
            UPDATE ambassador
            SET password_hash = $2
            WHERE referral_code = $1
            RETURNING referral_code
            """,
            referral_code,
            new_hash,
        )

    if not updated:
        raise HTTPException(status_code=404, detail="Ambassador non trovato")

    return {"ok": True}


@app.delete("/api/ambassadors/{referral_code}", dependencies=[Depends(require_admin)])
async def delete_ambassador(referral_code: str):
    async with db_pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute("DELETE FROM click WHERE referral_code = $1", referral_code)
            result = await connection.execute("DELETE FROM ambassador WHERE referral_code = $1", referral_code)

    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Ambassador non trovato")

    return {"ok": True}


@app.get("/api/stats", dependencies=[Depends(require_admin)])
async def global_stats():
    async with db_pool.acquire() as connection:
        totals = await connection.fetchrow(
            """
            SELECT
                COUNT(*)::int AS total_clicks,
                COUNT(*) FILTER (WHERE is_swiss = TRUE)::int AS swiss_clicks,
                COUNT(DISTINCT referral_code)::int AS active_referrals
            FROM click
            """
        )
        total_ambassadors = await connection.fetchval("SELECT COUNT(*)::int FROM ambassador")

    total_clicks = totals["total_clicks"] or 0
    swiss_clicks = totals["swiss_clicks"] or 0
    swiss_ratio = (swiss_clicks / total_clicks) if total_clicks else 0

    return {
        "total_clicks": total_clicks,
        "swiss_clicks": swiss_clicks,
        "swiss_ratio": swiss_ratio,
        "total_ambassadors": total_ambassadors,
        "active_referrals": totals["active_referrals"] or 0,
    }


@app.post("/api/ambassador/login")
async def ambassador_login(payload: AmbassadorLoginRequest):
    referral_code = payload.referral_code.strip().lower()

    async with db_pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT referral_code, name, password_hash
            FROM ambassador
            WHERE referral_code = $1
            """,
            referral_code,
        )

    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    token = create_ambassador_token(referral_code)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": AMBASSADOR_TOKEN_TTL_SECONDS,
        "ambassador": {
            "referral_code": row["referral_code"],
            "name": row["name"],
        },
    }


@app.get("/api/ambassador/me/stats")
async def ambassador_my_stats(referral_code: str = Depends(require_ambassador)):
    async with db_pool.acquire() as connection:
        totals = await connection.fetchrow(
            """
            SELECT
                COUNT(*)::int AS total_clicks,
                COUNT(*) FILTER (WHERE is_swiss = TRUE)::int AS swiss_clicks
            FROM click
            WHERE referral_code = $1
            """,
            referral_code,
        )

        ambassador_name = await connection.fetchval(
            "SELECT name FROM ambassador WHERE referral_code = $1",
            referral_code,
        )

    total_clicks = totals["total_clicks"] or 0
    swiss_clicks = totals["swiss_clicks"] or 0

    return {
        "referral_code": referral_code,
        "name": ambassador_name,
        "total_clicks": total_clicks,
        "swiss_clicks": swiss_clicks,
        "swiss_ratio": (swiss_clicks / total_clicks) if total_clicks else 0,
    }


@app.get("/api/ambassador/me/clicks")
async def ambassador_my_clicks(
    limit: int = 100,
    referral_code: str = Depends(require_ambassador),
):
    safe_limit = max(1, min(limit, 500))

    async with db_pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                ip_address::text AS ip_address,
                is_swiss,
                user_agent,
                clicked_at
            FROM click
            WHERE referral_code = $1
            ORDER BY clicked_at DESC
            LIMIT $2
            """,
            referral_code,
            safe_limit,
        )

    return [
        {
            "ip_address": row["ip_address"],
            "ip_masked": mask_ip(row["ip_address"]),
            "is_swiss": row["is_swiss"],
            "user_agent": row["user_agent"],
            "clicked_at": row["clicked_at"],
        }
        for row in rows
    ]