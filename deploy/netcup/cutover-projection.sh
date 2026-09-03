#!/usr/bin/env bash
set -Eeuo pipefail

release_dir="/opt/relayone/releases/projection-beta-20260903"
projection_environment="/etc/relayone/relayone-projection.env"
active_environment="/etc/relayone/relayone.env"

test -f "$release_dir/dist-server/server/server.js"
test -f "$projection_environment"
test "$(systemctl is-active postgresql)" = active

if [ -f /tmp/relayone-projection.pid ]; then
  projection_pid="$(cat /tmp/relayone-projection.pid)"
  if kill -0 "$projection_pid" 2>/dev/null; then
    kill "$projection_pid"
  fi
fi

systemctl stop relayone.service
ln -sfn "$release_dir" /opt/relayone/current
sed \
  -e 's/^PORT=.*/PORT=6060/' \
  -e "s|^FRONTEND_DIST=.*|FRONTEND_DIST=$release_dir/dist|" \
  "$projection_environment" >"$active_environment.next"
chown root:sntr "$active_environment.next"
chmod 0640 "$active_environment.next"
mv "$active_environment.next" "$active_environment"

cat >/etc/systemd/system/relayone.service <<'EOF'
[Unit]
Description=Relay One independent public presentation
After=network-online.target postgresql.service
Wants=network-online.target postgresql.service

[Service]
Type=simple
User=sntr
Group=sntr
WorkingDirectory=/opt/relayone/current
EnvironmentFile=/etc/relayone/relayone.env
ExecStart=/usr/bin/node dist-server/server/server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadOnlyPaths=/opt/relayone
ReadWritePaths=/var/lib/relayone/assets

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart relayone.service
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --max-time 3 --fail --silent http://127.0.0.1:6060/api/health/ready >/dev/null; then
    echo "Relay One projection is active on port 6060."
    exit 0
  fi
  sleep 1
done
systemctl status relayone.service --no-pager -l
exit 1
