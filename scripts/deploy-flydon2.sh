#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${FLYDECK_V2_DEPLOY_HOST:-flydon@192.168.178.38}"
deploy_dir="${FLYDECK_V2_DEPLOY_DIR:-/home/flydon/.local/share/flydeck-v2/releases/current}"
public_url="${FLYDECK_V2_PUBLIC_URL:-https://flydon.tail4df832.ts.net}"
ssh_config="${FLYDECK_V2_SSH_CONFIG:-/dev/null}"
ssh_options=(-F "$ssh_config" -o BatchMode=yes -o ConnectTimeout=8)

cd "$project_root"

echo "Testing and building Flydeck v2 for /v2..."
npm test --workspace flydeck-backend-v2
npm test --workspace flydeck-frontend-v2
npm run lint --workspace flydeck-frontend-v2
npm run build --workspace flydeck-backend-v2
npm run build --workspace flydeck-frontend-v2 -- --base=/v2/

echo "Preparing the isolated v2 release directory on $deploy_host..."
ssh "${ssh_options[@]}" "$deploy_host" "mkdir -p '$deploy_dir'"

echo "Synchronizing Flydeck v2 to $deploy_host..."
rsync -az --delete \
  -e "ssh -F $ssh_config -o BatchMode=yes -o ConnectTimeout=8" \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='backend/.env' \
  --exclude='backend-v2/.env' \
  --exclude='node_modules/' \
  "$project_root/" "$deploy_host:$deploy_dir/"

echo "Installing dependencies, migrating PostgreSQL, and restarting v2..."
ssh "${ssh_options[@]}" "$deploy_host" \
  "set -eu
   export PATH=/home/flydon/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin
   cd '$deploy_dir'
   npm install --no-audit --no-fund
   install -m 600 deploy/flydon/flydeck-v2.env /home/flydon/.config/flydeck-v2.env
   install -m 644 deploy/flydon/flydeck-v2.service /home/flydon/.config/systemd/user/flydeck-v2.service
   set -a
   . /home/flydon/.config/flydeck-v2.env
   set +a
   npm run migrate --workspace flydeck-backend-v2
   systemctl --user daemon-reload
   systemctl --user enable flydeck-v2.service >/dev/null
   systemctl --user restart flydeck-v2.service
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if curl --fail --silent http://127.0.0.1:5100/flydeck/api/v2/health/ready >/dev/null \
       && curl --fail --silent http://127.0.0.1:5100/v2/ >/dev/null; then
       break
     fi
     if [ \"\$attempt\" -eq 10 ]; then
       systemctl --user status flydeck-v2.service --no-pager -l
       exit 1
     fi
     sleep 1
   done
   test \"\$(systemctl --user is-active flydeck-v2.service)\" = active
   tailscale serve --bg --yes --set-path /v2 http://127.0.0.1:5100/v2
   tailscale serve --bg --yes --set-path /flydeck/api/v2 http://127.0.0.1:5100/flydeck/api/v2"

echo "Checking public v2 endpoints and the unchanged v1 endpoint..."
curl --fail --silent --show-error "$public_url/v2/" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/v2/health/ready" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/v2/auth/session" >/dev/null
curl --fail --silent --show-error "$public_url/flydeck/api/health" >/dev/null

echo "Flydeck v2 deployment completed: $public_url/v2/"
