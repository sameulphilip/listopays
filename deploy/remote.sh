#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/listopays-console
export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get update -y
apt-get install -y nginx
npm install -g pm2

cd "$APP_DIR"
npm install
npm run build

pm2 delete listopays-console >/dev/null 2>&1 || true
pm2 start npm --name listopays-console -- start -- -p 3060
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

mkdir -p /etc/nginx/snippets
cp "$APP_DIR/deploy/listopays-locations.conf" /etc/nginx/snippets/listopays-locations.conf
if [ -f /etc/letsencrypt/live/listopays.doubleclickds.com/fullchain.pem ]; then
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
else
  cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/listopays-console
fi
ln -sfn /etc/nginx/sites-available/listopays-console /etc/nginx/sites-enabled/listopays-console
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi

certbot --nginx -d listopays.doubleclickds.com --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
