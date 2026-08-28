# Relay One

Relay One is Flydeck's deliberately small public presentation layer. It reads
explicitly shared DATA subtrees and exposes only those subtrees through a read-only
website suitable for Tailscale Funnel.

## Security boundary

- Publication roots are persisted DATA nodes with sharing enabled and a
  required public share name. A browser cannot select an unshared root.
- Descendants are resolved in PostgreSQL from those roots; ancestors, siblings,
  `_system`, and `_trash` cannot be requested through the API.
- Image access repeats the descendant check before a file is sent.
- The service binds to loopback only. Funnel is the public ingress.
- There are no write, login, maintenance, or generic tree endpoints.
- Production should use the read-only PostgreSQL role in
  `deploy/relayone/create-readonly-role.sql` rather than Flydon's writer role.

Sharing a folder is recursive and live: newly created descendants become
visible, while moving a node out of a shared folder or disabling sharing removes
it. Nested sharing roots are not duplicated when an ancestor is already shared. Responses are
cached for at most `PUBLIC_CACHE_SECONDS` (15 seconds by default).
Within a shared subtree, a descendant's existing share name replaces its DATA
name as the public label without turning that descendant into another root.
The public root list follows the UUID order stored by Flydeck in
`_system/views/_shared`; published roots not listed there are appended in their
DATA order.

## Local development

Copy `.env.example` to `.env`, then set `DATABASE_URL` and `IMAGE_DIRECTORY`.

Run the API and Vite UI in separate terminals:

```bash
npm run dev:server --workspace flydeck-relayone
npm run dev --workspace flydeck-relayone
```

The UI is then available at `http://127.0.0.1:5173`; Vite proxies `/api` to
Relay One on port 6060.

For a production-style local run:

```bash
npm run build --workspace flydeck-relayone
npm start --workspace flydeck-relayone
```

## Funnel

Build and start Relay One first. Verify that
`http://127.0.0.1:6060/api/health/ready` returns `ready`, then explicitly make it
public:

```bash
./relayone/scripts/funnel-on.sh
```

Disable the public endpoint with:

```bash
./relayone/scripts/funnel-off.sh
```

Funnel uses the Tailscale node's `.ts.net` hostname. A distinct
`relayone.<tailnet>.ts.net` hostname therefore requires a second Tailscale
identity. On Flydon, `deploy/relayone/relayone-tailscaled.service` runs that
identity in userspace networking mode without changing the existing `flydon`
node. Do not publish Relay One through a developer workstation's Funnel.

The user service template is `deploy/relayone/relayone.service`. Its environment
belongs at `/home/flydon/.config/relayone.env`; keep that file outside releases
and source control.
