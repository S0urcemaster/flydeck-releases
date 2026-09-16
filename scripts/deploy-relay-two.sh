#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${RELAY_TWO_DEPLOY_HOST:-sntr@relay-one.de}"
deploy_root="${RELAY_TWO_DEPLOY_ROOT:-/home/sntr/relay-two/current}"
public_url="${RELAY_TWO_PUBLIC_URL:-https://relay-two.relay-one.de}"
flydeck_image_tag="${FLYDECK_IMAGE_TAG:-relay-two}"
flydeck_image="flydeck-hosted:${flydeck_image_tag}"
ssh_options=(-F /dev/null -o BatchMode=yes -o ConnectTimeout=8)

cd "$project_root"

echo "Testing Relay Two Hosted Flydeck locally..."
npm test --workspace @flydeck/shared
npm test --workspace flydeck-backend-v2
npm test --workspace flydeck-frontend-v2
npm run lint --workspace flydeck-frontend-v2

echo "Building $flydeck_image locally..."
docker build \
  --build-arg FLYDECK_FRONTEND_BASE=/flydeck/ \
  --file Dockerfile.flydeck \
  --tag "$flydeck_image" \
  .

echo "Synchronizing Relay Two Compose configuration..."
rsync -az --delete \
  --exclude='.env' \
  -e "ssh -F /dev/null -o BatchMode=yes -o ConnectTimeout=8" \
  "$project_root/deploy/relay-node/" \
  "$deploy_host:$deploy_root/deploy/relay-node/"

echo "Transferring the prebuilt image to $deploy_host..."
docker save "$flydeck_image" \
  | gzip -1 \
  | ssh "${ssh_options[@]}" "$deploy_host" 'gzip -dc | docker load'

echo "Restarting Relay Two Hosted Flydeck without a remote build..."
ssh "${ssh_options[@]}" "$deploy_host" \
  "set -eu
   cd '$deploy_root/deploy/relay-node'
   FLYDECK_IMAGE_TAG='$flydeck_image_tag' docker compose -p relay-two up \
     -d --no-deps --no-build --force-recreate hosted-flydeck
   for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
     if curl --fail --silent \
       http://127.0.0.1:6081/flydeck/api/v2/health/ready >/dev/null 2>&1; then
       exit 0
     fi
     if [ \"\$attempt\" -eq 12 ]; then
       docker compose -p relay-two logs --tail=80 hosted-flydeck
       exit 1
     fi
     sleep 2
   done"

echo "Checking the public Relay Two endpoint..."
curl --fail --silent --show-error \
  "$public_url/flydeck/api/v2/health/ready" >/dev/null

echo "Relay Two Hosted Flydeck deployment completed: $public_url/flydeck/"
