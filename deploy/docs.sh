#!/usr/bin/env bash
# Builds docs/ and publishes them at https://docs.trysonoma.xyz (adds the Caddy site the first time).
# Needs a DNS A record for docs.trysonoma.xyz pointing at the VPS.
# Usage (from the project folder):  bash deploy/docs.sh [user@host]
set -euo pipefail
HOST="${1:-root@103.247.8.52}"
DIR="$(cd "$(dirname "$0")" && pwd)"
(cd "$DIR/.." && node tools/build-docs.js)
B64="$(tr -d '\r' < "$DIR/docs-remote.sh" | base64 -w0)"
tar -czf - -C "$DIR/../docs-site" . | ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash -c \"\$(echo $B64 | base64 -d)\""
echo "Done: https://docs.trysonoma.xyz/"
