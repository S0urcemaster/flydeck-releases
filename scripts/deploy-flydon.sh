#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${FLYDECK_DEPLOY_HOST:-flydon@192.168.178.38}"
deploy_dir="${FLYDECK_DEPLOY_DIR:-/home/flydon/.local/share/flydeck/releases/current}"
public_url="${FLYDECK_PUBLIC_URL:-https://flydon.tail4df832.ts.net}"

cd "$project_root"

echo "Building and testing Flydeck..."
npm test
npm run build

echo "Synchronizing release to $deploy_host..."
rsync -az --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='backend/.env' \
  --exclude='node_modules/' \
  "$project_root/" "$deploy_host:$deploy_dir/"

echo "Installing dependencies and restarting Flydeck..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "$deploy_host" \
  "set -eu
   export PATH=/home/flydon/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin
   cd '$deploy_dir'
   npm install --no-audit --no-fund
   systemctl --user restart flydeck.service
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if curl --fail --silent http://127.0.0.1:5000/flydeck/api/health >/dev/null 2>&1; then
       break
     fi
     if [ \"\$attempt\" -eq 10 ]; then
       systemctl --user status flydeck.service --no-pager -l
       exit 1
     fi
     sleep 1
   done
   test \"\$(systemctl --user is-active flydeck.service)\" = active
   curl --fail --silent --show-error http://127.0.0.1:5000/flydeck/api/data >/dev/null
   curl --fail --silent --show-error http://127.0.0.1:5000/ >/dev/null"

echo "Checking public Tailscale endpoints..."
curl --fail --silent --show-error "$public_url/" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/health" >/dev/null

echo "Flydeck deployment completed: $public_url/"
