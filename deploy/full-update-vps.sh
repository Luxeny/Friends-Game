#!/bin/bash
# Полное обновление на VPS — скопируйте и вставьте в SSH одним блоком.
set -euo pipefail

cd /var/www/friends-game

echo "==> Backup .env"
cp .env /root/friends-game.env.backup

echo "==> Download latest code"
curl -fsSL https://github.com/Luxeny/Friends-Game/archive/refs/heads/main.tar.gz -o /tmp/fg.tar.gz
rm -rf /tmp/fg-new && mkdir -p /tmp/fg-new
tar -xzf /tmp/fg.tar.gz -C /tmp/fg-new
rsync -a --delete \
  --exclude .env \
  --exclude node_modules \
  --exclude .next \
  --exclude server-dist \
  /tmp/fg-new/Friends-Game-main/ /var/www/friends-game/

cp /root/friends-game.env.backup .env

echo "==> Build (frontend + server)"
npm ci
npm run build
npm run build:server

echo "==> Restart"
chown -R www-data:www-data /var/www/friends-game
systemctl restart friends-game
sleep 2

echo ""
echo "==> Status"
systemctl is-active friends-game

echo ""
echo "==> Check (must be HTML, NOT 'ok')"
curl -fsS -H "Accept: text/html" http://127.0.0.1:8080/ | head -c 120
echo ""
echo ""
echo "Done. Open http://85.239.44.117/ and press Ctrl+F5"
