# Runs on the VPS (sent by deploy.sh). Reads a .tar.gz of landing/ from stdin.
set -e
PORT="${PORT:-8080}"
export DEBIAN_FRONTEND=noninteractive
if ! command -v nginx >/dev/null; then apt-get update -qq </dev/null && apt-get install -y -qq nginx </dev/null; fi
rm -rf /var/www/sonoma.new && mkdir -p /var/www/sonoma.new
tar -xzf - -C /var/www/sonoma.new
rm -rf /var/www/sonoma.old
if [ -d /var/www/sonoma ]; then mv /var/www/sonoma /var/www/sonoma.old; fi
mv /var/www/sonoma.new /var/www/sonoma
chown -R www-data:www-data /var/www/sonoma
cat > /etc/nginx/sites-available/sonoma <<CONF
server {
    listen $PORT;
    listen [::]:$PORT;
    server_name _;
    root /var/www/sonoma;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    location / { try_files \$uri \$uri/ /index.html; }
    location /images/ { expires 7d; add_header Cache-Control public; }
}
CONF
ln -sf /etc/nginx/sites-available/sonoma /etc/nginx/sites-enabled/sonoma
# nginx must never claim port 80/443 here: another site already uses them
rm -f /etc/nginx/sites-enabled/default
if grep -rqsE 'listen[^;]*\b(80|443)\b' /etc/nginx/sites-enabled/; then echo "Another nginx site listens on 80/443; aborting"; exit 1; fi
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then ufw allow "$PORT/tcp" >/dev/null; fi
echo DEPLOY_OK
