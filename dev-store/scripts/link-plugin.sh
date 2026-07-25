#!/usr/bin/env bash
# Publish the parent Cryptonly Medusa plugin into the local yalc store and link it here.
set -euo pipefail

STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$(cd "$STORE_DIR/.." && pwd)"

cd "$PLUGIN_DIR"
echo "==> Building plugin in $PLUGIN_DIR"
npm run build
echo "==> Publishing plugin to yalc"
npx yalc publish --no-scripts

cd "$STORE_DIR"
echo "==> Linking @cryptonly/medusa-plugin-cryptonly into dev-store"
npx yalc add @cryptonly/medusa-plugin-cryptonly
npm install --no-fund --no-audit

echo "==> Plugin linked. Restart \`npm run dev\` if the Medusa server is already running."
