#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/friends-game"
REPO="${REPO:-https://github.com/Luxeny/Friends-Game.git}"
DOMAIN="${DOMAIN:-}"

echo "==> Installing packages"
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

echo "==> Installing Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Cloning app"
mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
git pull origin main

if [ ! -f .env ]; then
  echo "Create $APP_DIR/.env with GROQ_* keys before starting."
  cp .env.example .env 2>/dev/null || true
fi

echo "==> Building"
npm ci
npm run build
npm run build:server

echo "==> Permissions"
chown -R www-data:www-data "$APP_DIR"
chmod +x start.sh

echo "==> systemd"
cp deploy/friends-game.service /etc/systemd/system/friends-game.service
systemctl daemon-reload
systemctl enable friends-game
systemctl restart friends-game

echo "==> nginx"
cp deploy/nginx/friends-game.conf /etc/nginx/sites-available/friends-game.conf
if [ -n "$DOMAIN" ]; then
  sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/friends-game.conf
fi
ln -sf /etc/nginx/sites-available/friends-game.conf /etc/nginx/sites-enabled/friends-game.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [ -n "$DOMAIN" ]; then
  echo "==> SSL"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" || true
fi

echo "Done. Check: systemctl status friends-game"
