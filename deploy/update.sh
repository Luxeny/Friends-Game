#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/friends-game"
REPO="${REPO:-Luxeny/Friends-Game}"

cd "$APP_DIR"

if [ -d .git ]; then
  git pull origin main
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "==> Downloading latest from GitHub (tarball)"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  curl -fsSL \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/tarball/main" \
    -o "$tmpdir/app.tar.gz"
  tar -xzf "$tmpdir/app.tar.gz" -C "$tmpdir"
  src="$(find "$tmpdir" -mindepth 1 -maxdepth 1 -type d | head -1)"
  rsync -a --delete \
    --exclude .env \
    --exclude node_modules \
    --exclude .next \
    --exclude server-dist \
    "$src/" "$APP_DIR/"
else
  echo "No git repo in $APP_DIR."
  echo ""
  echo "Option A — one-time fix (uuid patch + rebuild):"
  echo "  bash deploy/patch-uuid.sh"
  echo ""
  echo "Option B — set up git for future updates:"
  echo "  cd $APP_DIR && git init && git remote add origin https://github.com/$REPO.git"
  echo "  git fetch origin main && git reset --hard origin/main"
  echo "  (use a Personal Access Token as password if the repo is private)"
  echo ""
  echo "Option C — download tarball with token:"
  echo "  export GITHUB_TOKEN=ghp_... && bash deploy/update.sh"
  exit 1
fi

npm ci
npm run build
npm run build:server
chown -R www-data:www-data "$APP_DIR"
systemctl restart friends-game
echo "Updated and restarted."
