#!/usr/bin/env sh
set -eu

cat > /app/.env <<EOF
AMBASSADOR_DASHBOARD_API_BASE=${AMBASSADOR_DASHBOARD_API_BASE:-http://localhost:8000}
EOF

exec python -m http.server "${PORT:-8080}" --bind 0.0.0.0 --directory /app
