#!/usr/bin/env bash
# Clone Medusa Next.js starter (if missing) and overlay Cryptonly payment patches.
set -euo pipefail

STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$(cd "$STORE_DIR/.." && pwd)"
SF_DIR="$PLUGIN_DIR/dev-storefront"
PATCH_DIR="$STORE_DIR/patches/storefront"
STARTER_REPO="${CRYPTONLY_STOREFRONT_REPO:-https://github.com/medusajs/nextjs-starter-medusa.git}"

if [[ ! -f "$SF_DIR/package.json" ]]; then
  echo "==> Cloning Medusa Next.js starter into $SF_DIR"
  rm -rf "$SF_DIR"
  git clone --depth 1 "$STARTER_REPO" "$SF_DIR"
  rm -rf "$SF_DIR/.git"
else
  echo "==> Storefront already present at $SF_DIR (skip clone)"
fi

echo "==> Applying Cryptonly payment overlays..."
# Overlay paths mirror the starter src/ tree
cp -R "$PATCH_DIR/src/." "$SF_DIR/src/"

echo "==> Installing storefront dependencies..."
cd "$SF_DIR"
if [[ ! -d node_modules ]]; then
  npm install --no-fund --no-audit
fi

echo "==> Storefront bootstrap complete."
