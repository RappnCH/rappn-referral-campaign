# Referral Dashboard

Due pagine, servite dallo stesso container:

| Pagina | Cosa fa |
|---|---|
| `index.html` | **La board.** Performance di ogni link di download, per canale e per lingua: totali, quota svizzera, classifica, e l'allarme sui codici che non stanno contando. Nessuna dipendenza esterna, un file solo. |
| `manage.html` | La gestione: crea, modifica ed elimina i codici referral (la vecchia dashboard). |

## La board

Legge `GET /api/ambassadors` e incrocia il risultato con l'elenco dei link che
Rappn pubblica davvero: 13 codici social + `landing`.

- **Barre**: la lunghezza è il numero di click unici, la parte accesa è la Svizzera.
- **Vista per canale / classifica**: la prima confronta le lingue dentro un canale,
  la seconda mette in fila tutti e 14 i link.
- **Tutti i click / solo Svizzera**: cambia la metrica che ordina tutto.
- **Allarme rosso**: un codice che è vivo nei post ma non ha una riga nella tabella
  `ambassador`. Il tracker scarta quel click (`ambassador_not_found`) e l'utente viene
  comunque mandato allo store, quindi **non sembra rotto**: i click spariscono e basta.
  È il motivo per cui questa board esiste.
- **Nota sui numeri**: c'è un indice unico su `(referral_code, ip_address)`, quindi un
  IP conta **una volta sola per sempre** su ogni codice. Sono visitatori unici, non visite.

I codici degli ambassador umani non compaiono nella board (che è dedicata ai canali
Rappn), ma vengono contati e segnalati a fondo pagina.

### Se il backend non è raggiungibile

La board non resta vuota: mostra l'ultimo export noto, marcato **Snapshot** nel chip in
alto a destra, e apre il pannello "Show live numbers" dove si può incollare l'output di

```bash
curl -H "x-admin-token: YOUR_ADMIN_TOKEN" \
     https://YOUR-BACKEND.up.railway.app/api/ambassadors
```

Il JSON viene interpretato nel browser, non viene inviato da nessuna parte.

## Avvio rapido

1. Avvia il backend (`referral_server`) su `http://localhost:8000`.
2. Copia la configurazione: `cp .env.example .env`
3. Da questa cartella: `python3 -m http.server 5173`
4. Apri `http://localhost:5173`.

Variabili supportate (lette da `.env` da entrambe le pagine):

- `DASHBOARD_API_BASE` (es. `http://localhost:8000`)
- `DASHBOARD_REFERRAL_BASE` (es. `https://rappn.ch/api/download`, usata da `manage.html`)
- `DASHBOARD_ADMIN_TOKEN` (se usi `ADMIN_TOKEN` nel backend)

### Railway (dashboard service)

- `DASHBOARD_API_BASE=https://<tuo-backend>.up.railway.app`
- `DASHBOARD_REFERRAL_BASE=https://rappn.ch/api/download`

## ⚠️ Nota di sicurezza (preesistente, da decidere)

`docker-entrypoint.sh` scrive `DASHBOARD_ADMIN_TOKEN` dentro `/app/.env`, e la cartella
`/app` è servita da `python -m http.server`. Quindi **chiunque conosca l'URL della
dashboard può leggere l'admin token** aprendo `/.env`, e con quello ha accesso a tutti
gli endpoint `/api/*`. Non è stato cambiato in questa PR perché tocca il modello di
deploy. Le due strade normali sono: togliere il token dall'`.env` servito e farlo
digitare all'operatore (resta in `localStorage`), oppure mettere la dashboard dietro
un proxy autenticato che inietta l'header lato server.

## API usate

- `GET /api/stats`
- `GET /api/ambassadors`
- `POST /api/ambassadors`
- `DELETE /api/ambassadors/{referral_code}`

`POST /api/ambassadors` supporta anche `password` (opzionale, min 8).

## Note backend

- `DASHBOARD_ALLOWED_ORIGINS=http://localhost:5173`
- `ADMIN_TOKEN=...` (obbligatorio per gli endpoint `/api/*`)

## Non ancora possibile: l'andamento nel tempo

La board mostra i totali, non la tendenza, perché lato admin non esiste una serie
storica: `clicked_at` è in tabella e `/api/ambassador/me/activity` la usa già, ma solo
per l'ambassador loggato. Servirebbe un endpoint additivo tipo
`GET /api/activity?days=30` (stessa query, raggruppata anche per `referral_code`,
dietro `require_admin`). La board è pronta ad accoglierlo.
