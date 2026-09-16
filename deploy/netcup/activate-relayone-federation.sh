#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

environment_file=/etc/relayone/relayone.env
service_file=/etc/systemd/system/relayone.service
caddy_file=/etc/caddy/Caddyfile

test -f "$environment_file"
test -f "$service_file"
test -f "$caddy_file"

install -d -o sntr -g sntr -m 0750 /var/lib/relayone/identity

if grep -q '^RELAY_FEDERATION_ENABLED=' "$environment_file"; then
  sed -i 's/^RELAY_FEDERATION_ENABLED=.*/RELAY_FEDERATION_ENABLED=true/' "$environment_file"
else
  printf '\nRELAY_FEDERATION_ENABLED=true\n' >>"$environment_file"
fi
if grep -q '^RELAY_NODE_ID=' "$environment_file"; then
  sed -i 's/^RELAY_NODE_ID=.*/RELAY_NODE_ID=relay-one/' "$environment_file"
else
  printf 'RELAY_NODE_ID=relay-one\n' >>"$environment_file"
fi
if grep -q '^RELAY_PUBLIC_ORIGIN=' "$environment_file"; then
  sed -i 's|^RELAY_PUBLIC_ORIGIN=.*|RELAY_PUBLIC_ORIGIN=https://relay-one.de|' "$environment_file"
else
  printf 'RELAY_PUBLIC_ORIGIN=https://relay-one.de\n' >>"$environment_file"
fi
if grep -q '^RELAY_IDENTITY_DIRECTORY=' "$environment_file"; then
  sed -i 's|^RELAY_IDENTITY_DIRECTORY=.*|RELAY_IDENTITY_DIRECTORY=/var/lib/relayone/identity|' "$environment_file"
else
  printf 'RELAY_IDENTITY_DIRECTORY=/var/lib/relayone/identity\n' >>"$environment_file"
fi

if grep -q '^ReadWritePaths=' "$service_file"; then
  sed -i 's|^ReadWritePaths=.*|ReadWritePaths=/var/lib/relayone/assets /var/lib/relayone/identity|' "$service_file"
fi

install -o root -g root -m 0644 /home/sntr/Caddyfile.relay-one "$caddy_file"
systemctl daemon-reload
caddy validate --config "$caddy_file"
systemctl reload caddy
systemctl restart relayone.service

for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:6060/api/health/ready >/dev/null; then
    echo "Relay One federation is active."
    exit 0
  fi
  sleep 1
done

systemctl status relayone.service --no-pager -l
exit 1
