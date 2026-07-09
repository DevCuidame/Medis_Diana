#!/bin/bash
echo "=== sites-enabled ==="
ls /etc/nginx/sites-enabled/
echo
for f in /etc/nginx/sites-enabled/*; do
  echo "--- $f ---"
  grep -E 'server_name|proxy_pass|listen' "$f"
done
echo
echo "=== .env PORTs ==="
for d in acaripole medisXime medisdiana; do
  echo "--- $d ---"
  grep -E '^PORT=' /var/www/$d/apps/backend/.env 2>/dev/null
done
echo
echo "=== pm2 ecosystem ports (cwd) ==="
for d in acaripole medisXime medisdiana; do
  echo "--- $d ---"
  cat /var/www/$d/ecosystem.config.cjs 2>/dev/null | grep -E "name:|args:"
done
