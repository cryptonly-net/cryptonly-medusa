#!/usr/bin/env bash
# Set MEDUSA_BACKEND_URL (and optional return URL) for Cryptonly webhooks via a public HTTPS tunnel.
set -euo pipefail

STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$STORE_DIR/.env"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 https://YOUR_SUBDOMAIN.ngrok-free.app"
  echo "Starts from: ngrok http 9000"
  exit 1
fi

URL="${1%/}"
if [[ ! "$URL" =~ ^https:// ]]; then
  echo "Error: tunnel URL must be https://..."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$STORE_DIR/.env.example" "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example"
fi

upsert() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # portable-ish in-place replace
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$ENV_FILE" >"$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

upsert "MEDUSA_BACKEND_URL" "$URL"
upsert "CRYPTONLY_WEBHOOK_URL" "$URL/hooks/payment/cryptonly_cryptonly"
# Keep shoppers on the local storefront after paying (tunnel is for webhooks only).
if ! grep -q '^CRYPTONLY_RETURN_URL=' "$ENV_FILE" || grep -q '^CRYPTONLY_RETURN_URL=$' "$ENV_FILE" || grep -q '^CRYPTONLY_RETURN_URL=http://localhost' "$ENV_FILE"; then
  upsert "CRYPTONLY_RETURN_URL" "http://localhost:8000"
fi

echo "Updated $ENV_FILE:"
echo "  MEDUSA_BACKEND_URL=$URL"
echo "  CRYPTONLY_WEBHOOK_URL=$URL/hooks/payment/cryptonly_cryptonly"
grep '^CRYPTONLY_RETURN_URL=' "$ENV_FILE" | sed 's/^/  /'
echo
echo "Restart the Medusa server so the provider picks up the new webhook URL."
echo "Storefront stays at http://localhost:8000 — invoices use the tunnel for webhooks."
