import os
import secrets
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


class AmbassadorCreate(BaseModel):
    referral_code: str = Field(min_length=2, max_length=50)
    name: str | None = Field(default=None, max_length=100)


def require_admin(request: Request):
    if not admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN non configurato")

    provided = request.headers.get("x-admin-token", "")
    if not secrets.compare_digest(provided, admin_token):
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.on_event("startup")
async def startup():
    global db_pool, admin_token
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("La variabile d'ambiente DATABASE_URL non è impostata!")

    admin_token = os.getenv("ADMIN_TOKEN", "").strip()
    if not admin_token:
        raise ValueError("La variabile d'ambiente ADMIN_TOKEN non è impostata!")
    
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
async def track_and_redirect(referral_code: str, request: Request):
    # 1. Estrai il vero IP dell'utente
    # Essendo su Railway (dietro un proxy), l'IP reale si trova in "x-forwarded-for"
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host

    # 2. Estrai il dispositivo/browser usato
    user_agent = request.headers.get("user-agent", "")

    # 3. Controlla se l'IP è svizzero
    is_swiss = await check_is_swiss(ip_address)

    # 4. Salva il clic nel database (in modo asincrono)
    try:
        async with db_pool.acquire() as connection:
            # Verifica prima se l'ambassador esiste per evitare errori di Foreign Key
            ambassador_exists = await connection.fetchval(
                "SELECT 1 FROM ambassador WHERE referral_code = $1", referral_code
            )
            
            if ambassador_exists:
                await connection.execute(
                    """
                    INSERT INTO click (referral_code, ip_address, is_swiss, user_agent)
                    VALUES ($1, $2, $3, $4)
                    """,
                    referral_code, ip_address, is_swiss, user_agent
                )
            else:
                print(f"Clic ignorato: Ambassador '{referral_code}' non trovato nel DB.")
    except Exception as e:
        # Stampiamo l'errore ma NON blocchiamo l'utente
        print(f"Errore durante il salvataggio nel database: {e}")

    # 5. Esegui il Redirect istantaneo verso la tua app
    return RedirectResponse(url=DOWNLOAD_URL, status_code=302)

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

    try:
        async with db_pool.acquire() as connection:
            row = await connection.fetchrow(
                """
                INSERT INTO ambassador (referral_code, name)
                VALUES ($1, $2)
                RETURNING id, referral_code, name, created_at
                """,
                referral_code,
                name,
            )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Referral code già esistente")

    return {**dict(row), "total_clicks": 0, "swiss_clicks": 0}


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