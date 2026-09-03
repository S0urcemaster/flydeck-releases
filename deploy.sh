#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_host="${FLYDECK_DEPLOY_HOST:-flydon@192.168.178.38}"
flydeck_dir="${FLYDECK_DEPLOY_DIR:-/home/flydon/.local/share/flydeck-v2/releases/current}"
relayone_dir="${RELAYONE_DEPLOY_DIR:-/home/flydon/.local/share/relayone/releases/current}"
flydeck_url="${FLYDECK_PUBLIC_URL:-https://flydon.tail4df832.ts.net}"
relayone_url="${RELAYONE_PUBLIC_URL:-https://relayone.tail4df832.ts.net}"
ssh_config="${FLYDECK_SSH_CONFIG:-/dev/null}"
ssh_options=(-F "$ssh_config" -o BatchMode=yes -o ConnectTimeout=8)

cd "$project_root"

echo "Testing Flydeck V2 and Relay One..."
npm test --workspace @flydeck/shared
npm test --workspace flydeck-backend-v2
npm test --workspace flydeck-frontend-v2
npm test --workspace flydeck-relayone
npm run lint --workspace flydeck-frontend-v2

echo "Building Flydeck V2 for / and Relay One..."
npm run build --workspace @flydeck/shared
npm run build --workspace flydeck-backend-v2
npm run build --workspace flydeck-frontend-v2 -- --base=/
npm run build --workspace flydeck-relayone

echo "Preparing release directories on $deploy_host..."
ssh "${ssh_options[@]}" "$deploy_host" \
  "mkdir -p '$flydeck_dir' '$relayone_dir'"

echo "Synchronizing Flydeck V2..."
rsync -az --delete \
  -e "ssh -F $ssh_config -o BatchMode=yes -o ConnectTimeout=8" \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='backend/.env' \
  --exclude='backend-v2/.env' \
  --exclude='node_modules/' \
  --exclude='relayone/.env' \
  "$project_root/" "$deploy_host:$flydeck_dir/"

echo "Synchronizing Relay One..."
rsync -az --delete \
  -e "ssh -F $ssh_config -o BatchMode=yes -o ConnectTimeout=8" \
  --exclude='.env' \
  --exclude='node_modules/' \
  "$project_root/relayone/" "$deploy_host:$relayone_dir/"

echo "Installing and activating Flydeck V2 and Relay One..."
ssh "${ssh_options[@]}" "$deploy_host" \
  "set -eu
   export PATH=/home/flydon/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin

   cd '$flydeck_dir'
   npm install --no-audit --no-fund
   install -m 600 deploy/flydon/flydeck-v2.env /home/flydon/.config/flydeck-v2.env
   install -m 644 deploy/flydon/flydeck-v2.service /home/flydon/.config/systemd/user/flydeck-v2.service
   set -a
   . /home/flydon/.config/flydeck-v2.env
   set +a
   npm run migrate --workspace flydeck-backend-v2

   cd '$relayone_dir'
   npm install --omit=dev --no-audit --no-fund
   echo 'Dependencies installed; installing service definitions...'
   install -m 600 '$flydeck_dir/deploy/relayone/relayone.flydon.env' /home/flydon/.config/relayone.env
   install -m 644 '$flydeck_dir/deploy/relayone/relayone.service' /home/flydon/.config/systemd/user/relayone.service
   install -m 644 '$flydeck_dir/deploy/relayone/relayone-tailscaled.service' /home/flydon/.config/systemd/user/relayone-tailscaled.service

   systemctl --user daemon-reload
   echo 'Restarting Flydeck V2 and Relay One...'
   systemctl --user disable --now flydeck.service >/dev/null 2>&1 || true
   systemctl --user enable flydeck-v2.service relayone.service relayone-tailscaled.service >/dev/null
   systemctl --user restart flydeck-v2.service
   systemctl --user restart relayone.service
   systemctl --user start relayone-tailscaled.service

   flydeck_ready=false
   relayone_ready=false
   echo 'Waiting for local readiness checks...'
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if curl --max-time 3 --fail --silent http://127.0.0.1:5100/flydeck/api/v2/health/ready >/dev/null \
       && curl --max-time 3 --fail --silent http://127.0.0.1:5100/ >/dev/null; then
       flydeck_ready=true
     fi
     if curl --max-time 3 --fail --silent http://127.0.0.1:6060/api/health/ready >/dev/null; then
       relayone_ready=true
     fi
     echo "Readiness attempt \$attempt/10: flydeck=\$flydeck_ready relayone=\$relayone_ready"
     if [ \"\$flydeck_ready\" = true ] && [ \"\$relayone_ready\" = true ]; then
       break
     fi
     sleep 1
   done
   if [ \"\$flydeck_ready\" != true ]; then
     systemctl --user status flydeck-v2.service --no-pager -l
     exit 1
   fi
   if [ \"\$relayone_ready\" != true ]; then
     systemctl --user status relayone.service --no-pager -l
     exit 1
   fi

   echo 'Publishing Flydeck through Tailscale Serve...'
   timeout 20s tailscale serve reset
   timeout 20s tailscale serve --bg --yes http://127.0.0.1:5100

   relay_socket=\"/run/user/\$(id -u)/relayone-tailscale/tailscaled.sock\"
   echo 'Waiting for the isolated Relay One Tailscale socket...'
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if [ -S \"\$relay_socket\" ]; then
       break
     fi
     sleep 1
   done
   test -S \"\$relay_socket\"
   echo 'Publishing Relay One through Tailscale Funnel...'
   timeout 20s tailscale --socket=\"\$relay_socket\" status >/dev/null
   timeout 20s tailscale --socket=\"\$relay_socket\" funnel --bg --yes http://127.0.0.1:6060

   test \"\$(systemctl --user is-active flydeck-v2.service)\" = active
   test \"\$(systemctl --user is-active relayone.service)\" = active
   test \"\$(systemctl --user is-active relayone-tailscaled.service)\" = active"

echo "Checking public endpoints..."
curl --fail --silent --show-error "$flydeck_url/" >/dev/null
curl --fail --silent --show-error "$flydeck_url/flydeck/api/v2/health/ready" >/dev/null
curl --fail --silent --show-error "$flydeck_url/flydeck/api/v2/auth/session" >/dev/null
curl --fail --silent --show-error "$relayone_url/api/health/ready" >/dev/null
curl --fail --silent --show-error "$relayone_url/" >/dev/null

echo "Deployment completed:"
echo "  Flydeck:  $flydeck_url/"
echo "  Relay One: $relayone_url/"
