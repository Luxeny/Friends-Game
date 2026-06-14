#!/bin/sh
set -e

echo "[entrypoint] starting Friends' Game"
echo "[entrypoint] PORT=${PORT:-8080} NODE_ENV=${NODE_ENV:-unset} PWD=$(pwd)"

if [ ! -f server/preload.cjs ]; then
  echo "[entrypoint] ERROR: server/preload.cjs not found"
  exit 1
fi

if [ ! -f server-dist/server/index.js ]; then
  echo "[entrypoint] ERROR: server-dist/server/index.js not found (run build:server)"
  exit 1
fi

if [ ! -d .next ]; then
  echo "[entrypoint] ERROR: .next directory not found (run next build)"
  exit 1
fi

exec node server/preload.cjs
