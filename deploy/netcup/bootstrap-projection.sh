#!/usr/bin/env bash
set -Eeuo pipefail

release_dir="/opt/relayone/releases/projection-beta-20260903"
environment_file="/etc/relayone/relayone-projection.env"
secret_copy="/home/sntr/.relayone-ingest-secret"

test -f "$release_dir/dist-server/server/server.js"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql
systemctl enable --now postgresql

if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='sntr'" | grep -qx 1; then
  runuser -u postgres -- createuser sntr
fi
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_database WHERE datname='relayone'" | grep -qx 1; then
  runuser -u postgres -- createdb --owner=sntr relayone
fi

install -d -o sntr -g sntr -m 0750 /var/lib/relayone/assets
install -d -o root -g sntr -m 0750 /etc/relayone

if [ ! -s "$secret_copy" ]; then
  umask 077
  head -c 48 /dev/urandom | base64 -w0 >"$secret_copy"
  chown sntr:sntr "$secret_copy"
fi
secret="$(cat "$secret_copy")"

umask 027
cat >"$environment_file" <<EOF
NODE_ENV=production
PORT=6061
HOST=127.0.0.1
DATABASE_URL=postgresql://sntr@%2Fvar%2Frun%2Fpostgresql/relayone
DATABASE_SSL=false
RELAYONE_TITLE=Relay One
RELAYONE_INFO=
RELAY_DATA_SOURCE=projection
RELAY_ASSET_DIRECTORY=/var/lib/relayone/assets
RELAY_MAX_ASSET_BYTES=26214400
RELAY_INGEST_SECRET=$secret
PUBLIC_CACHE_SECONDS=15
FRONTEND_DIST=$release_dir/dist
EOF
chown root:sntr "$environment_file"
chmod 0640 "$environment_file"

echo "Projection prerequisites are ready; the public relayone.service was not changed."
