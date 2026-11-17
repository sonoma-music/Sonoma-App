#!/usr/bin/env bash
# Makes Caddy retry HTTPS certificates (trysonoma.xyz, docs.trysonoma.xyz) right away after DNS starts working.
# Restarting Caddy pauses its sites for about a second.
# Usage (from the project folder):  bash deploy/refresh-cert.sh [user@host]
HOST="${1:-root@103.247.8.52}"
ssh -o StrictHostKeyChecking=accept-new "$HOST" 'systemctl restart caddy && sleep 20 && journalctl -u caddy --since "-25s" --no-pager | grep -iE "trysonoma|certificate obtained|error" | tail -8; echo REFRESH_DONE'
