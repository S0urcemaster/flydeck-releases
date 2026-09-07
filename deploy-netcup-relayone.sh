#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_host="${RELAYONE_NETCUP_HOST:-sntr@relay-one.de}"
release_root="${RELAYONE_NETCUP_RELEASE_ROOT:-/opt/relayone/releases}"
release_id="${RELAYONE_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
release_dir="$release_root/$release_id"
public_url="${RELAYONE_PUBLIC_URL:-https://relay-one.de}"
ssh_config="${RELAYONE_SSH_CONFIG:-/dev/null}"
ssh_options=(-F "$ssh_config" -o BatchMode=yes -o ConnectTimeout=8)

cd "$project_root"
npm test --workspace flydeck-relayone
npm run build --workspace flydeck-relayone

ssh "${ssh_options[@]}" "$deploy_host" "test \"\$(systemctl is-active postgresql)\" = active; mkdir -p '$release_dir'"
rsync -az --delete \
  -e "ssh -F $ssh_config -o BatchMode=yes -o ConnectTimeout=8" \
  --exclude='.env' \
  --exclude='node_modules/' \
  "$project_root/relayone/" "$deploy_host:$release_dir/"

ssh "${ssh_options[@]}" "$deploy_host" \
  "set -eu
   export PATH=/opt/relayone/runtime/node-v22.23.2/bin:/usr/bin:/bin
   cd '$release_dir'
   npm ci --omit=dev --no-audit --no-fund
   while IFS='=' read -r key value; do
     case \"\$key\" in ''|'#'*) continue;; esac
     export \"\$key=\$value\"
   done </etc/relayone/relayone.env
   export FRONTEND_DIST='$release_dir/dist'
   npm run migrate
   node --check dist-server/server/server.js"

echo "Activating $release_id on $deploy_host (sudo may prompt)..."
ssh -tt -F "$ssh_config" -o ConnectTimeout=8 "$deploy_host" \
  "sudo ln -sfn '$release_dir' /opt/relayone/current && \
   sudo sed -i 's|^FRONTEND_DIST=.*|FRONTEND_DIST=/opt/relayone/current/dist|' /etc/relayone/relayone.env && \
   sudo systemctl restart relayone.service"

ssh "${ssh_options[@]}" "$deploy_host" \
  "set -eu
   for attempt in 1 2 3 4 5 6 7 8 9 10; do
     if curl --max-time 3 --fail --silent http://127.0.0.1:6060/api/health/ready >/dev/null; then
       exit 0
     fi
     sleep 1
   done
   systemctl status relayone.service --no-pager -l
   exit 1"

curl --fail --silent --show-error "$public_url/api/health/ready" >/dev/null
curl --fail --silent --show-error "$public_url/api/site" >/dev/null
echo "Relay One deployed independently: $public_url"
