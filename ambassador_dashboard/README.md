# Ambassador Dashboard

Dashboard per ambassador con accesso tramite credenziali e visualizzazione click del proprio referral.

## Avvio locale

1. Copia `.env.example` in `.env`
2. Imposta `AMBASSADOR_DASHBOARD_API_BASE` con l'URL del backend
3. Avvia un server statico in questa cartella:

```bash
python3 -m http.server 5180
```

4. Apri `http://localhost:5180`

## Flusso autenticazione

- Login via `POST /api/ambassador/login`
- Token Bearer salvato in `sessionStorage`
- Dati caricati da:
  - `GET /api/ambassador/me/stats`
  - `GET /api/ambassador/me/clicks`

## Sicurezza

- Password ambassador hashata lato server con PBKDF2-SHA256
- Token firmato HMAC con scadenza
- Ogni ambassador vede solo i click del proprio `referral_code`

Nota: l'URL backend non è editabile da UI, viene letto solo da `AMBASSADOR_DASHBOARD_API_BASE`.
