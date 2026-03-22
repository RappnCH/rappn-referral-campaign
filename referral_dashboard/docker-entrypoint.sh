#!/usr/bin/env sh
set -eu

cat > /app/.env <<EOF
DASHBOARD_API_BASE=${DASHBOARD_API_BASE:-http://localhost:8000}
DASHBOARD_REFERRAL_BASE=${DASHBOARD_REFERRAL_BASE:-}
DASHBOARD_ADMIN_TOKEN=${DASHBOARD_ADMIN_TOKEN:-}
EOF

exec python -m http.server "${PORT:-8080}" --bind 0.0.0.0 --directory /app
