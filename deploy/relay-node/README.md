# Relay Node container

This package runs the same Relay Node build for Relay One, Relay Two, or a
future independent installation. Node roles are configuration, not editions.

## Local/reference start

1. Copy `.env.example` to `.env` and replace both secrets.
2. Run `docker compose build` in this directory.
3. Run `docker compose up -d`.
4. Check `http://127.0.0.1:6070/api/health/ready` and `/api/node`.

The database, content-addressed assets, and cryptographic node identity use
separate named volumes. Replacing the application container does not replace
these stores. Reusing an identity volume with a different `RELAY_NODE_ID` is
rejected. The container runs database migrations before starting the HTTP
server.

For Netcup, Caddy should terminate TLS for the configured public origin and
proxy to `127.0.0.1:6070`. Do not publish the PostgreSQL service or the Relay
container port on a public interface.

Capability flags describe installed and enabled server behavior. Do not enable
federation, accounts, or diagnostics before the corresponding module exists;
the reference environment deliberately leaves them disabled.

## Relay Two Hosted Flydeck deployment

From the repository root, run `./scripts/deploy-relay-two.sh`. It runs the
tests and builds the Hosted Flydeck image on the local machine, streams the
compressed image to Relay Two over SSH, and recreates only the
`hosted-flydeck` container. The Netcup host does not compile the application.

The defaults target `sntr@relay-one.de`, the Compose project `relay-two`, and
`/home/sntr/relay-two/current`. They can be overridden with
`RELAY_TWO_DEPLOY_HOST`, `RELAY_TWO_DEPLOY_ROOT`, `RELAY_TWO_PUBLIC_URL`, and
`FLYDECK_IMAGE_TAG`.
