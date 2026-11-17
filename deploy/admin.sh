#!/usr/bin/env bash
# Installs or updates the admin panel at https://trysonoma.xyz/admin (contract address + X account).
# The first run creates an admin token and prints it once. Keep it secret.
# Usage (from the project folder):  bash deploy/admin.sh [user@host]
set -euo pipefail
HOST="${1:-root@103.247.8.52}"
DIR="$(cd "$(dirname "$0")" && pwd)"
B64="$(base64 -w0 "$DIR/admin-remote.sh")"
tar -czf - -C "$DIR/../admin" server.js public | ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash -c \"\$(echo $B64 | base64 -d)\""
