#!/bin/bash
# Usage: DOMAIN=your-domain.ru EMAIL=you@mail.ru bash deploy/setup-domain.sh
set -euo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: DOMAIN=your-domain.ru EMAIL=you@mail.ru bash deploy/setup-domain.sh"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  EMAIL="admin@${DOMAIN}"
fi

CONF="/etc/nginx/sites-available/friends-game.conf"

if [ ! -f "$CONF" ]; then
  cp /var/www/friends-game/deploy/nginx/friends-game.conf "$CONF"
  ln -sf "$CONF" /etc/nginx/sites-enabled/friends-game.conf
  rm -f /etc/nginx/sites-enabled/default
fi

sed -i "s/server_name .*/server_name ${DOMAIN};/" "$CONF"

nginx -t
systemctl reload nginx

echo "==> Requesting SSL certificate for ${DOMAIN}"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo ""
echo "Done. Open: https://${DOMAIN}/"
echo "Invite links will look like: https://${DOMAIN}/join/XXXXXXXX"
