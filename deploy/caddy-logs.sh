#!/usr/bin/env bash
# Read-only: shows Caddy's recent certificate messages for the Sonoma sites.
# Usage (from the project folder):  bash deploy/caddy-logs.sh [user@host]
HOST="${1:-root@103.247.8.52}"
ssh -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s' <<'REMOTE'
echo "== caddy status"; systemctl is-active caddy
echo "== docs block present?"; grep -n "docs.trysonoma.xyz" /etc/caddy/Caddyfile
echo "== certificates on disk"; ls /var/lib/caddy/.local/share/caddy/certificates/*/ 2>/dev/null
echo "== recent certificate log lines"
journalctl -u caddy --since "-3h" --no-pager | grep -iE "docs\.trysonoma|obtain|challenge|acme|error" | tail -25
REMOTE
