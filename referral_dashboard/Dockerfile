FROM python:3.12-slim

WORKDIR /app

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=8080 \
    DASHBOARD_API_BASE=http://localhost:8000 \
    DASHBOARD_ADMIN_TOKEN=

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
