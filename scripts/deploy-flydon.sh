#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${FLYDECK_DEPLOY_HOST:-flydon@192.168.178.38}"
deploy_dir="${FLYDECK_DEPLOY_DIR:-/home/flydon/.local/share/flydeck-v2/releases/current}"
public_url="${FLYDECK_PUBLIC_URL:-https://flydon.tail4df832.ts.net}"

cd "$project_root"

echo "Testing and building Flydeck V2..."
npm test --workspace @flydeck/shared
npm test --workspace flydeck-backend-v2
npm test --workspace flydeck-frontend-v2
npm run lint --workspace flydeck-frontend-v2
npm run build --workspace @flydeck/shared
npm run build --workspace flydeck-backend-v2
npm run build --workspace flydeck-frontend-v2 -- --base=/

echo "Synchronizing Flydeck V2 release to $deploy_host..."
rsync -az --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='backend/.env' \
  --exclude='backend-v2/.env' \
  --exclude='relayone/.env' \
  --exclude='node_modules/' \
  "$project_root/" "$deploy_host:$deploy_dir/"

echo "Installing dependencies and restarting Flydeck V2..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "$deploy_host" \
  "set -eu
   export PATH=/home/flydon/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin
   cd '$deploy_dir'
   npm install --no-audit --no-fund
   install -m 600 deploy/flydon/flydeck-v2.env /home/flydon/.config/flydeck-v2.env
   install -m 644 deploy/flydon/flydeck-v2.service /home/flydon/.config/systemd/user/flydeck-v2.service
   systemctl --user daemon-reload
   systemctl --user disable --now flydeck.service >/dev/null 2>&1 || true
   systemctl --user reset-failed flydeck.service >/dev/null 2>&1 || true
   systemctl --user enable flydeck-v2.service >/dev/null
   systemctl --user restart flydeck-v2.service
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if curl --fail --silent http://127.0.0.1:5100/flydeck/api/v2/health/ready >/dev/null 2>&1; then
       break
     fi
     if [ \"\$attempt\" -eq 10 ]; then
       systemctl --user status flydeck-v2.service --no-pager -l
       exit 1
     fi
     sleep 1
   done
   test \"\$(systemctl --user is-active flydeck-v2.service)\" = active
   curl --fail --silent --show-error http://127.0.0.1:5100/flydeck/api/v2/auth/session >/dev/null
   curl --fail --silent --show-error http://127.0.0.1:5100/ >/dev/null"

echo "Checking public Tailscale endpoints..."
curl --fail --silent --show-error "$public_url/" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/v2/health/ready" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/v2/auth/session" >/dev/null

echo "Flydeck V2 deployment completed: $public_url/"
