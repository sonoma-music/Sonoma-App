# Runs on the VPS (sent by caddy.sh). Adds trysonoma.xyz to the existing Caddyfile, safely.
set -e
CF=/etc/caddy/Caddyfile
MARK='# ---- SONOMA (trysonoma.xyz) ----'
if grep -qF "$MARK" "$CF"; then echo "Sonoma block already present"; else
  cp "$CF" "$CF.bak-sonoma-$(date +%Y%m%d-%H%M%S)"
  cat >> "$CF" <<'BLOCK'

# ---- SONOMA (trysonoma.xyz) ----
trysonoma.xyz {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
	@images path /images/*
	header @images Cache-Control "public, max-age=604800"
	root * /var/www/sonoma
	file_server
}

www.trysonoma.xyz {
	redir https://trysonoma.xyz{uri} permanent
}
BLOCK
fi
if ! caddy validate --config "$CF" --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
  echo "Caddyfile invalid, restoring backup:"; tail -5 /tmp/caddy-validate.log
  LAST=$(ls -t "$CF".bak-sonoma-* | head -1); cp "$LAST" "$CF"; exit 1
fi
systemctl reload caddy
echo CADDY_OK
