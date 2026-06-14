#!/bin/bash
set -euo pipefail

cd /var/www/friends-game
git pull origin main
npm ci
npm run build
npm run build:server
chown -R www-data:www-data /var/www/friends-game
systemctl restart friends-game
echo "Updated and restarted."
