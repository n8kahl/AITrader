#!/usr/bin/env bash
set -euo pipefail

# Railpack fallback: run the Node app in apps/gateway
cd "$(dirname "$0")/apps/gateway"

if [ ! -d node_modules ]; then
  npm ci
fi

npm run build

# Respect Railway's injected PORT env var
echo "Starting server on PORT=${PORT:-8080}"
exec npm start

