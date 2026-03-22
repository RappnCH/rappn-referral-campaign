FROM python:3.12-slim

WORKDIR /app

COPY ambassador_dashboard/. /app
COPY ambassador_dashboard/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=8080 \
    AMBASSADOR_DASHBOARD_API_BASE=http://localhost:8000

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
