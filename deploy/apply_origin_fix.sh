#!/usr/bin/env bash
set -euo pipefail
cp /var/www/listopays-console/deploy/listopays-locations.conf /etc/nginx/snippets/listopays-locations.conf
nginx -t
systemctl reload nginx
echo origin-fix-applied
