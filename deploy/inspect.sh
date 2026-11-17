#!/usr/bin/env bash
# Read-only: shows which program serves ports 80/443 on the VPS and how it is configured.
# Usage (from the project folder):  bash deploy/inspect.sh [user@host]
HOST="${1:-root@103.247.8.52}"
ssh -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s' <<'REMOTE'
echo "== listeners on 80/443"; ss -ltnp | grep -E ':(80|443)\b'
echo "== caddy";  command -v caddy && (ls /etc/caddy/ 2>/dev/null; cat /etc/caddy/Caddyfile 2>/dev/null | head -60)
echo "== docker"; command -v docker >/dev/null && docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null
echo "== pm2/node"; ps -eo pid,comm,args | grep -E 'node|bun|deno|caddy|traefik|haproxy|apache|httpd' | grep -v grep | head -15
echo "== systemd web units"; systemctl list-units --type=service --state=running 2>/dev/null | grep -Ei 'caddy|traefik|apache|httpd|haproxy|node|pm2|sonna' 
REMOTE
