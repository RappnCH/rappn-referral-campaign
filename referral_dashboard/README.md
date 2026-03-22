# Referral Dashboard

Dashboard web semplice per gestire i referral del server FastAPI.

## Avvio rapido

1. Avvia il backend (`referral_server`) su `http://localhost:8000`.
2. Configura il file `.env` della dashboard (puoi copiare `.env.example`):

```bash
cp .env.example .env
```

Variabili supportate:

- `DASHBOARD_API_BASE` (es. `http://localhost:8000`)
- `DASHBOARD_REFERRAL_BASE` (es. `https://rappn.ch/api/download`, usata per i link referral da condividere)
- `DASHBOARD_ADMIN_TOKEN` (se usi `ADMIN_TOKEN` nel backend)

### Railway (dashboard service)

Imposta nelle Variables del servizio dashboard:

- `DASHBOARD_API_BASE=https://<tuo-backend>.up.railway.app`
- `DASHBOARD_REFERRAL_BASE=https://rappn.ch/api/download`

3. Da questa cartella avvia un server statico:

```bash
python3 -m http.server 5173
```

4. Apri `http://localhost:5173`.
5. I campi Backend URL / Admin Token vengono precompilati da `.env` (e salvati in localStorage dopo modifiche UI).

## API usate

- `GET /api/stats`
- `GET /api/ambassadors`
- `POST /api/ambassadors`
- `DELETE /api/ambassadors/{referral_code}`

## Note backend

Imposta nel backend:

- `DASHBOARD_ALLOWED_ORIGINS=http://localhost:5173`
- `ADMIN_TOKEN=...` (obbligatorio per usare gli endpoint `/api/*`)
