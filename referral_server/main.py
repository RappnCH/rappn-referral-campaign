import os
import httpx
import asyncpg
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

# Carica le variabili dal file .env (utile solo per i test in locale)
load_dotenv()

app = FastAPI()

# URL di destinazione per il download
DOWNLOAD_URL = "https://rappn.ch/api/download"

# Variabile globale per il pool di connessioni al DB
db_pool = None

@app.on_event("startup")
async def startup():
    global db_pool
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("La variabile d'ambiente DATABASE_URL non è impostata!")
    
    # Crea un pool di connessioni al database PostgreSQL
    db_pool = await asyncpg.create_pool(database_url)

@app.on_event("shutdown")
async def shutdown():
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
                "SELECT 1 FROM ambassadors WHERE referral_code = $1", referral_code
            )
            
            if ambassador_exists:
                await connection.execute(
                    """
                    INSERT INTO clicks (referral_code, ip_address, is_swiss, user_agent)
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