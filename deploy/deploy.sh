#!/usr/bin/env bash
# Deploy Study Tracker (web app + AI API) to the VPS. Safe to re-run.
#
#   bash deploy/deploy.sh            # build here, upload, restart
#   bash deploy/deploy.sh --setup    # first time only: user, service, nginx, HTTPS
#
# Lives at https://study.t-plusplus.tech (wildcard DNS already points at the
# VPS). One Node process on 127.0.0.1:4700 serves the built app and /api.
# Secrets (OPENROUTER_API_KEY) live ONLY in /srv/study-tracker/.env on the
# server — never in this repo and never in the browser bundle.
set -euo pipefail

HOST="${HOST:-mohammed-2}"
DOMAIN="${DOMAIN:-study.t-plusplus.tech}"
APP_DIR=/srv/study-tracker
PORT=4700
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--setup" ]; then
  ssh "$HOST" bash -s <<SETUP
set -euo pipefail
id studytracker >/dev/null 2>&1 || useradd --system --home $APP_DIR --shell /usr/sbin/nologin studytracker
mkdir -p $APP_DIR/server/data
if [ ! -f $APP_DIR/.env ]; then
  cat > $APP_DIR/.env <<ENV
PORT=$PORT
SERVE_STATIC=true
OPENROUTER_REFERER=https://$DOMAIN
OPENROUTER_MODELS=deepseek/deepseek-v4-flash,qwen/qwen3.7-flash
AI_USER_DAILY_LIMIT=80
AI_DAILY_BUDGET_USD=1
# OPENROUTER_API_KEY=   <- add by hand on the server
ENV
fi
chown -R studytracker:studytracker $APP_DIR
chmod 600 $APP_DIR/.env

cat > /etc/systemd/system/study-tracker.service <<UNIT
[Unit]
Description=Study Tracker web app + Tachycardia AI API ($DOMAIN)
After=network.target

[Service]
Type=simple
User=studytracker
Group=studytracker
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=HOME=/tmp
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $APP_DIR/server/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$APP_DIR/server/data

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/sites-available/study-tracker.conf <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 1m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/study-tracker.conf /etc/nginx/sites-enabled/study-tracker.conf
nginx -t && systemctl reload nginx
systemctl daemon-reload
systemctl enable study-tracker >/dev/null
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --redirect -m admin@t-plusplus.tech || echo "certbot failed — rerun: certbot --nginx -d $DOMAIN"
SETUP
  echo "Setup done. Now put OPENROUTER_API_KEY in $APP_DIR/.env on the server, then run: bash deploy/deploy.sh"
  exit 0
fi

echo "→ tests + build"
npm test >/dev/null
npm run build >/dev/null

echo "→ upload"
rsync -az --delete dist/ "$HOST:$APP_DIR/dist/"
rsync -az --delete --exclude data/ server/ "$HOST:$APP_DIR/server/"
rsync -az package.json package-lock.json "$HOST:$APP_DIR/"

echo "→ install + restart"
ssh "$HOST" "cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund >/dev/null && chown -R studytracker:studytracker $APP_DIR && chmod 600 $APP_DIR/.env && systemctl restart study-tracker && sleep 2 && curl -fsS http://127.0.0.1:$PORT/api/health"
echo
echo "✓ https://$DOMAIN"
