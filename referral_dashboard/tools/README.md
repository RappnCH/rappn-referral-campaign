# seal.mjs — cambiare le credenziali della board

La board (`../index.html`) non confronta password: apre un blob AES-GCM con una chiave
derivata da *account + password*. Per cambiare le credenziali si ri-sigilla il blob.

```bash
# 1. i numeri da sigillare, nel formato di /api/ambassadors
curl -H "x-admin-token: $ADMIN_TOKEN" https://<backend>/api/ambassadors \
  | python -c 'import json,sys; print(json.dumps({"label":"Referral export, <data>","rows":json.load(sys.stdin)}))' \
  > snapshot.json

# 2. sigilla (le credenziali stanno solo qui, mai in un file)
BOARD_USER='<account>' BOARD_PASS='<password>' node seal.mjs

# 3. incolla il contenuto di vault.json dopo `const VAULT = ` in ../index.html
```

Non committare mai `snapshot.json` (è il testo in chiaro) né le credenziali.
Non esiste recupero: password persa = si ri-sigilla e basta.
