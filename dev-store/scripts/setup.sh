#!/usr/bin/env bash
# Bootstrap the local Medusa harness for Cryptonly payment provider development.
set -euo pipefail

STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$(cd "$STORE_DIR/.." && pwd)"
cd "$STORE_DIR"

SEED=1
CREATE_USER=1
for arg in "$@"; do
  case "$arg" in
    --no-seed) SEED=0 ;;
    --no-user) CREATE_USER=0 ;;
    -h|--help)
      echo "Usage: $0 [--no-seed] [--no-user]"
      exit 0
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required (for Postgres)."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — fill CRYPTONLY_* credentials before testing payments."
fi

echo "==> Starting Postgres (docker compose)..."
docker compose up -d
echo "==> Waiting for Postgres health..."
for i in $(seq 1 40); do
  if docker compose exec -T postgres pg_isready -U medusa -d cryptonly_medusa_dev >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" -eq 40 ]]; then
    echo "Error: Postgres did not become ready."
    exit 1
  fi
done

echo "==> Installing plugin deps + building + yalc publish..."
cd "$PLUGIN_DIR"
if [[ ! -d node_modules ]]; then
  npm install --no-fund --no-audit
fi
if ! npm run build; then
  echo
  echo "Error: plugin build failed."
  echo "If you see Rollup/esbuild native errors (@rollup/rollup-darwin-arm64, @esbuild/...),"
  echo "do NOT use sudo. From the plugin root run:"
  echo "  rm -rf node_modules package-lock.json && npm install --no-fund --no-audit"
  echo "Then re-run: npm run env:setup"
  exit 1
fi
npx yalc publish --no-scripts

echo "==> Installing Medusa app deps..."
cd "$STORE_DIR"
if [[ ! -d node_modules ]]; then
  npm install --no-fund --no-audit
fi

echo "==> Linking Cryptonly payment plugin..."
npx yalc add @cryptonly/medusa-plugin-cryptonly
npm install --no-fund --no-audit

echo "==> Running database migrations..."
npx medusa db:migrate

if [[ "$SEED" -eq 1 ]]; then
  echo "==> Seeding demo data (includes pp_cryptonly_cryptonly on Europe region)..."
  if ! npm run seed; then
    echo "Warning: seed failed (may already be seeded). Continuing."
  fi
fi

if [[ "$CREATE_USER" -eq 1 ]]; then
  echo "==> Ensuring admin user admin@cryptonly.local / supersecret..."
  if ! npx medusa user -e admin@cryptonly.local -p supersecret; then
    echo "    User may already exist - login with admin@cryptonly.local / supersecret"
  fi
fi

echo "==> Bootstrapping Next.js storefront..."
bash "$STORE_DIR/scripts/bootstrap-storefront.sh"
bash "$STORE_DIR/scripts/write-storefront-env.sh"

cat <<EOF

==> Dev store is ready.

  Admin:      http://localhost:9000/app
  Login:      admin@cryptonly.local / supersecret
  API:        http://localhost:9000
  Storefront: http://localhost:8000  (npm run env:storefront)

Next:
  1. Fill CRYPTONLY_API_KEY / ACCOUNT_ID / WEBHOOK_SIGNING_KEY in .env
  2. Start tunnel:  ngrok http 9000
  3. ./scripts/set-tunnel-url.sh https://YOUR_SUBDOMAIN.ngrok-free.app
  4. From plugin root (two terminals):
       npm run env:dev
       npm run env:storefront
  5. Shop at http://localhost:8000 → checkout → Cryptonly → Pay with Cryptonly

Enable Cryptonly on the region in Admin if seed did not run:
  Settings → Regions → Europe → Payment providers → pp_cryptonly_cryptonly

EOF
