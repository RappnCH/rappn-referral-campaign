# Ambassador Dashboard

## EN

Dashboard for ambassadors with credential-based access and click trend monitoring.

### Local run

1. Copy `.env.example` to `.env`
2. Set `AMBASSADOR_DASHBOARD_API_BASE` with the backend URL
3. Start a static server in this folder:

```bash
python3 -m http.server 5180
```

4. Open `http://localhost:5180`

### Language support

- Supported languages: `en` (default), `it`, `fr`, `de`
- Language can be changed from the selector in the header
- Selected language is stored in `localStorage`

### Authentication flow

- Login via `POST /api/ambassador/login`
- Bearer token stored in `sessionStorage`
- Data loaded from:
  - `GET /api/ambassador/me/stats`
  - `GET /api/ambassador/me/activity?days=30`

### Security

- Ambassador password hashed server-side with PBKDF2-SHA256
- HMAC-signed token with expiration
- Each ambassador sees only KPI and trend for their own `referral_code`

Note: backend URL is not editable from the UI and is read only from `AMBASSADOR_DASHBOARD_API_BASE`.

## IT

Dashboard per ambassador con accesso tramite credenziali e trend dei click nel tempo.

### Avvio locale

1. Copia `.env.example` in `.env`
2. Imposta `AMBASSADOR_DASHBOARD_API_BASE` con l'URL del backend
3. Avvia un server statico in questa cartella:

```bash
python3 -m http.server 5180
```

4. Apri `http://localhost:5180`

### Supporto lingue

- Lingue supportate: `en` (predefinita), `it`, `fr`, `de`
- La lingua si cambia dal selettore nell'header
- La lingua scelta viene salvata in `localStorage`

### Flusso autenticazione

- Login via `POST /api/ambassador/login`
- Token Bearer salvato in `sessionStorage`
- Dati caricati da:
  - `GET /api/ambassador/me/stats`
  - `GET /api/ambassador/me/activity?days=30`

### Sicurezza

- Password ambassador hashata lato server con PBKDF2-SHA256
- Token firmato HMAC con scadenza
- Ogni ambassador vede solo KPI e trend del proprio `referral_code`

Nota: l'URL backend non è editabile da UI, viene letto solo da `AMBASSADOR_DASHBOARD_API_BASE`.

## FR

Tableau de bord pour ambassadeurs avec accès par identifiants et suivi de la tendance des clics.

### Exécution locale

1. Copiez `.env.example` vers `.env`
2. Définissez `AMBASSADOR_DASHBOARD_API_BASE` avec l'URL du backend
3. Lancez un serveur statique dans ce dossier :

```bash
python3 -m http.server 5180
```

4. Ouvrez `http://localhost:5180`

### Support des langues

- Langues prises en charge : `en` (par défaut), `it`, `fr`, `de`
- La langue se change depuis le sélecteur dans l'en-tête
- La langue choisie est enregistrée dans `localStorage`

### Flux d'authentification

- Connexion via `POST /api/ambassador/login`
- Jeton Bearer stocké dans `sessionStorage`
- Données chargées depuis :
  - `GET /api/ambassador/me/stats`
  - `GET /api/ambassador/me/activity?days=30`

### Sécurité

- Mot de passe ambassadeur haché côté serveur avec PBKDF2-SHA256
- Jeton signé HMAC avec expiration
- Chaque ambassadeur ne voit que les KPI et la tendance de son propre `referral_code`

Remarque : l'URL backend n'est pas modifiable depuis l'UI et est lue uniquement depuis `AMBASSADOR_DASHBOARD_API_BASE`.

## DE

Dashboard für Ambassadors mit Login über Zugangsdaten und Klicktrend-Übersicht.

### Lokaler Start

1. Kopiere `.env.example` nach `.env`
2. Setze `AMBASSADOR_DASHBOARD_API_BASE` auf die Backend-URL
3. Starte in diesem Ordner einen statischen Server:

```bash
python3 -m http.server 5180
```

4. Öffne `http://localhost:5180`

### Sprachunterstützung

- Unterstützte Sprachen: `en` (Standard), `it`, `fr`, `de`
- Sprache kann über den Selektor im Header geändert werden
- Gewählte Sprache wird in `localStorage` gespeichert

### Authentifizierungsfluss

- Login über `POST /api/ambassador/login`
- Bearer-Token in `sessionStorage` gespeichert
- Daten geladen von:
  - `GET /api/ambassador/me/stats`
  - `GET /api/ambassador/me/activity?days=30`

### Sicherheit

- Ambassador-Passwort serverseitig mit PBKDF2-SHA256 gehasht
- HMAC-signiertes Token mit Ablaufzeit
- Jeder Ambassador sieht nur KPI und Trend des eigenen `referral_code`

Hinweis: Die Backend-URL ist in der UI nicht editierbar und wird nur aus `AMBASSADOR_DASHBOARD_API_BASE` gelesen.
