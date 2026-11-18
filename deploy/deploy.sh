#!/usr/bin/env bash
# Deploys the website (landing/) to the VPS.
# Usage (from the project folder):  bash deploy/deploy.sh [user@host] [port]
# Port 80 on this VPS belongs to Caddy, so nginx listens on 8080; Caddy serves trysonoma.xyz from the same folder.
# You will be asked for the server password once (or not at all with an SSH key).
set -euo pipefail
HOST="${1:-root@103.247.8.52}"
PORT="${2:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$DIR/.."
SCRIPT_B64="$(tr -d '\r' < "$DIR/remote.sh" | base64 -w0)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -r "$ROOT/landing/." "$STAGE/"
# installers are served from GitHub Releases (built by .github/workflows/release.yml)
echo "Uploading website to $HOST ..."
tar -czf - -C "$STAGE" . | ssh -o StrictHostKeyChecking=accept-new "$HOST" "PORT=$PORT bash -c \"\$(echo $SCRIPT_B64 | base64 -d)\""
echo "Done: https://trysonoma.xyz/"
