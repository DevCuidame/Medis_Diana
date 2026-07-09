#!/bin/bash
set -euo pipefail

echo "--- Updating .env PORT 3007 -> 3008 ---"
sudo sed -i 's/^PORT=3007$/PORT=3008/' /var/www/medisdiana/apps/backend/.env
grep '^PORT=' /var/www/medisdiana/apps/backend/.env

echo "--- Updating nginx proxy_pass 3007 -> 3008 ---"
sudo sed -i 's#proxy_pass http://127.0.0.1:3007#proxy_pass http://127.0.0.1:3008#g' /etc/nginx/sites-available/medisdiana
grep proxy_pass /etc/nginx/sites-available/medisdiana

echo "--- Testing nginx config ---"
sudo nginx -t

echo "--- Reloading nginx ---"
sudo systemctl reload nginx

echo "--- Restarting medisdiana-backend via pm2 ---"
pm2 restart medisdiana-backend

echo "--- Waiting for stabilization ---"
sleep 5
pm2 status medisdiana-backend

echo "--- Health check on new port ---"
curl -s -o /dev/null -w "Backend /health on 3008: HTTP %{http_code}\n" http://127.0.0.1:3008/health || true

echo "--- Recent logs ---"
pm2 logs medisdiana-backend --lines 15 --nostream
