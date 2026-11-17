# Runs on the VPS (sent by docs.sh). Reads a .tar.gz of docs-site/ from stdin and publishes docs.trysonoma.xyz.
set -e
rm -rf /var/www/sonoma-docs.new && mkdir -p /var/www/sonoma-docs.new
tar -xzf - -C /var/www/sonoma-docs.new
rm -rf /var/www/sonoma-docs.old
if [ -d /var/www/sonoma-docs ]; then mv /var/www/sonoma-docs /var/www/sonoma-docs.old; fi
mv /var/www/sonoma-docs.new /var/www/sonoma-docs
chown -R www-data:www-data /var/www/sonoma-docs
CF=/etc/caddy/Caddyfile
MARK='# ---- SONOMA DOCS (docs.trysonoma.xyz) ----'
if ! grep -qF "$MARK" "$CF"; then
  cp "$CF" "$CF.bak-sonoma-docs-$(date +%Y%m%d-%H%M%S)"
  cat >> "$CF" <<'BLOCK'

# ---- SONOMA DOCS (docs.trysonoma.xyz) ----
docs.trysonoma.xyz {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
	root * /var/www/sonoma-docs
	try_files {path} {path}.html {path}/index.html
	file_server
	handle_errors {
		root * /var/www/sonoma-docs
		rewrite * /404.html
		file_server
	}
}
BLOCK
  if ! caddy validate --config "$CF" --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
    echo "Caddyfile invalid, restoring backup:"; tail -5 /tmp/caddy-validate.log
    cp "$(ls -t "$CF".bak-sonoma-docs-* | head -1)" "$CF"; exit 1
  fi
  systemctl reload caddy
fi
echo DOCS_OK
