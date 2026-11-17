#!/usr/bin/env bash
# Adds trysonoma.xyz (+ www redirect, automatic HTTPS) to the Caddy server on the VPS.
# Existing sites in the Caddyfile are left untouched; a backup is made first.
# Usage (from the project folder):  bash deploy/caddy.sh [user@host]
set -euo pipefail
HOST="${1:-root@103.247.8.52}"
DIR="$(cd "$(dirname "$0")" && pwd)"
B64="$(base64 -w0 "$DIR/caddy-remote.sh")"
ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash -c \"\$(echo $B64 | base64 -d)\""
