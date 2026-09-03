# Netcup Relay One deployment

Netcup runs an independent PostgreSQL database, Relay One backend, frontend and
asset directory. It must not have database, filesystem or reverse-proxy access
to Flydon.

1. Run `bootstrap-projection.sh` once as root to create PostgreSQL and storage.
2. Deploy releases below `/opt/relayone/releases` as user `sntr`.
3. Install `relayone.env.example` as `/etc/relayone/relayone.env`, mode `0600`,
   and replace the ingest secret.
4. Run `npm run migrate` from the release with that environment loaded.
5. Install and enable `relayone.service`.
6. Add `Caddyfile.relay-one` to Caddy and reload it.
7. Verify `/api/health/ready`; then configure Flydon with the same secret and
   `RELAY_INGEST_URL=https://relay-one.de/ingest/v1`.
8. Run `npm run relay:sync-all --workspace flydeck-backend-v2` once on Flydon.

After the one-time host setup, deploy from the repository root with:

```bash
./deploy-netcup-relayone.sh
```

The script uses `sntr@relay-one.de` by default and asks for sudo only for the
atomic `current` symlink switch and service restart. It deliberately does not
overwrite secrets, the systemd unit or the Caddy config.

Do not set `IMAGE_DIRECTORY` for the public projection. Do not proxy any route
to the Flydon Funnel. Assets pass through the local Relay One backend so it can
verify that each hash belongs to an active publication.
