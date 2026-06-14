#!/bin/bash
set -euo pipefail

cd /var/www/friends-game

if ! grep -q 'from "uuid"' lib/socket.ts; then
  sed -i '/from "socket.io-client";/a import { v4 as uuidv4 } from "uuid";' lib/socket.ts
fi

sed -i 's/return crypto.randomUUID();/return uuidv4();/' lib/socket.ts

echo "==> lib/socket.ts"
grep -n 'uuid\|createPlayerId' lib/socket.ts

npm run build
chown -R www-data:www-data /var/www/friends-game
systemctl restart friends-game
echo "Patched, rebuilt, restarted."
