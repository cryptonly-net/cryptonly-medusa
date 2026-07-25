#!/usr/bin/env bash
# Create a publishable API key and write dev-storefront/.env.local
# Note: macOS ships Bash 3.2 — never put UTF-8 after $VAR (use ${VAR}... instead).
set -euo pipefail

STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$(cd "$STORE_DIR/.." && pwd)"
SF_DIR="$PLUGIN_DIR/dev-storefront"
ENV_LOCAL="$SF_DIR/.env.local"

if [[ ! -d "$SF_DIR" ]]; then
  echo "Error: storefront missing at $SF_DIR — run bootstrap-storefront.sh first."
  exit 1
fi

cd "$STORE_DIR"

echo "==> Creating publishable API key and writing ${ENV_LOCAL}..."
STOREFRONT_ENV_PATH="$ENV_LOCAL" \
STOREFRONT_BACKEND_URL="http://localhost:9000" \
  npx medusa exec ./src/scripts/export-publishable-key.ts

if [[ ! -f "$ENV_LOCAL" ]]; then
  echo "Error: ${ENV_LOCAL} was not created."
  exit 1
fi

if ! grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_' "$ENV_LOCAL"; then
  echo "Error: publishable key missing or invalid in ${ENV_LOCAL}"
  exit 1
fi

echo "==> Storefront env ready:"
grep -E '^(NEXT_PUBLIC_MEDUSA_|MEDUSA_BACKEND|NEXT_PUBLIC_DEFAULT)' "$ENV_LOCAL" \
  | sed -E 's/(NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_)[A-Za-z0-9]+/\1.../'
