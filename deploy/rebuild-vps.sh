#!/bin/bash
set -euo pipefail

cd /var/www/friends-game

echo "==> Rebuilding Friends' Game"
npm ci
npm run build
npm run build:server
chown -R www-data:www-data /var/www/friends-game
systemctl restart friends-game

sleep 2
echo ""
echo "==> Service status"
systemctl is-active friends-game

echo ""
echo "==> Smoke test (should NOT be just 'ok')"
curl -fsS -H "Accept: text/html" http://127.0.0.1:8080/ | head -c 120
echo ""
echo ""
echo "Done. Open http://YOUR_IP/ in browser."
