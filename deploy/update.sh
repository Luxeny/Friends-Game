#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/friends-game"
REPO="${REPO:-Luxeny/Friends-Game}"

cd "$APP_DIR"

if [ -d .git ]; then
  git pull origin main
else
  echo "==> Downloading latest from GitHub (public repo, no token)"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.tar.gz" \
    -o "$tmpdir/app.tar.gz"
  tar -xzf "$tmpdir/app.tar.gz" -C "$tmpdir"
  src="$(find "$tmpdir" -mindepth 1 -maxdepth 1 -type d | head -1)"
  rsync -a --delete \
    --exclude .env \
    --exclude node_modules \
    --exclude .next \
    --exclude server-dist \
    "$src/" "$APP_DIR/"
fi

npm ci
npm run build
npm run build:server
chown -R www-data:www-data "$APP_DIR"
systemctl restart friends-game
echo "Updated and restarted."
