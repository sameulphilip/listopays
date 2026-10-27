#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/var/www/listopays-console
mkdir -p /etc/nginx/snippets
cp "$APP_DIR/deploy/listopays-locations.conf" /etc/nginx/snippets/listopays-locations.conf
cat > /etc/nginx/sites-available/listopays-console <<'NGINX'
server {
    server_name listopays.doubleclickds.com Listopays.doubleclickds.com;
    client_max_body_size 20m;
    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/listopays.doubleclickds.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/listopays.doubleclickds.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    include /etc/nginx/snippets/listopays-locations.conf;
}
server {
    listen 80;
    listen [::]:80;
    server_name listopays.doubleclickds.com Listopays.doubleclickds.com;
    return 301 https://$host$request_uri;
}
NGINX
nginx -t
systemctl reload nginx
cd "$APP_DIR"
npm run build
pm2 restart listopays-console
sleep 2
pm2 show listopays-console | sed -n "1,25p"
