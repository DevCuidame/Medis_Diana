#!/bin/sh
set -eu

: "${PORT:=8080}"
: "${BACKEND_URL:=http://127.0.0.1:3000}"

envsubst '$PORT $BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
