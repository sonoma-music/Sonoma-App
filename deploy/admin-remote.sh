# Runs on the VPS (sent by admin.sh). Reads a .tar.gz of admin/ from stdin, installs the admin service
# and routes trysonoma.xyz/admin and /api/* to it through Caddy.
set -e
mkdir -p /opt/sonoma-admin /var/lib/sonoma-admin
tar -xzf - -C /opt/sonoma-admin
chown -R www-data:www-data /var/lib/sonoma-admin
NEW_TOKEN=""
if [ ! -f /etc/sonoma-admin.env ]; then
  NEW_TOKEN=$(openssl rand -hex 24)
  printf 'ADMIN_TOKEN=%s\nPORT=4610\nDATA_DIR=/var/lib/sonoma-admin\n' "$NEW_TOKEN" > /etc/sonoma-admin.env
  chmod 600 /etc/sonoma-admin.env
fi
cat > /etc/systemd/system/sonoma-admin.service <<'UNIT'
[Unit]
Description=Sonoma admin (token & X account settings)
After=network.target

[Service]
EnvironmentFile=/etc/sonoma-admin.env
ExecStart=/usr/bin/node /opt/sonoma-admin/server.js
Restart=always
User=www-data
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/sonoma-admin
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable sonoma-admin >/dev/null 2>&1
systemctl restart sonoma-admin
sleep 1
systemctl is-active --quiet sonoma-admin || { journalctl -u sonoma-admin -n 20 --no-pager; exit 1; }

CF=/etc/caddy/Caddyfile
MARK='# sonoma-admin routes'
if ! grep -qF "$MARK" "$CF"; then
  cp "$CF" "$CF.bak-sonoma-admin-$(date +%Y%m%d-%H%M%S)"
  awk -v m="$MARK" '{print} /^trysonoma\.xyz \{$/ {print "	" m; print "	@sonomaAdmin path /api/* /admin /admin/*"; print "	reverse_proxy @sonomaAdmin 127.0.0.1:4610"}' "$CF" > "$CF.new" && cat "$CF.new" > "$CF" && rm -f "$CF.new"
  if ! grep -qF "$MARK" "$CF" || ! caddy validate --config "$CF" --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
    echo "Could not add the admin routes to Caddy, restoring backup:"; tail -5 /tmp/caddy-validate.log 2>/dev/null
    cp "$(ls -t "$CF".bak-sonoma-admin-* | head -1)" "$CF"; exit 1
  fi
  systemctl reload caddy
fi
echo
if [ -n "$NEW_TOKEN" ]; then
  echo "=========================================================="
  echo " ADMIN TOKEN (save it now, it is shown only once):"
  echo " $NEW_TOKEN"
  echo " Log in at https://trysonoma.xyz/admin"
  echo "=========================================================="
else
  echo "Admin token unchanged (stored in /etc/sonoma-admin.env)."
fi
echo ADMIN_OK
