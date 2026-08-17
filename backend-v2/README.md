# Flydeck backend-v2

Independent PostgreSQL backend foundation for frontend V2. It does not serve or
modify V1 data.

```sh
cp backend-v2/.env.example backend-v2/.env
npm run migrate --workspace flydeck-backend-v2
npm run dev --workspace flydeck-backend-v2
```

The default example URL targets a PostgreSQL database named `flydeck`. Create
the PostgreSQL role and database outside the application, set a real password
in `.env`, and keep `.env` out of version control.

For the first local installation, PostgreSQL can prompt for the new role's
password without putting it into shell history:

```sh
sudo -u postgres createuser --pwprompt flydeck
sudo -u postgres createdb --owner=flydeck flydeck
cp backend-v2/.env.example backend-v2/.env
```

Replace `change-me` in the private `.env` file with that password, then run the
migration. These administrator commands are intentionally not performed by
the application itself.

## Initial workspace and V1 import

On a new database, create the first owner and workspace without hand-written
SQL:

```sh
npm run bootstrap --workspace flydeck-backend-v2 -- \
  --user-name Sean \
  --workspace-name Home \
  --filesystem-root /home/sntr
```

The command prints the resulting `userId` and `workspaceId`. Use those IDs to
import V1 DATA Markdown files and V1 `cron.md`:

```sh
npm run import:v1 --workspace flydeck-backend-v2 -- \
  --user-id <userId> \
  --workspace-id <workspaceId> \
  --data-dir /home/sntr/flydesk-data \
  --cron-file /home/sntr/.flydon/cron.md
```

Each regular DATA `.md` file becomes one root `data-file` TreeBrowser node;
its complete Markdown is preserved as node content. Directories, symlinks,
non-Markdown files, and V1 trash are ignored. CRON keeps the V1 title, due
date, creation date, and active/expired status. Import keys make reruns skip
sources that were imported before, so later manual V2 edits are not
overwritten.

The importer validates every source before the first database write. AGNT,
FUNC, snippets, chat SQLite data, and trash are deliberately not imported.

The API base is `/flydeck/api/v2`. Liveness deliberately does not require the
database; readiness does:

```text
GET /flydeck/api/v2/health/live
GET /flydeck/api/v2/health/ready
GET /flydeck/api/v2/auth/session
POST /flydeck/api/v2/auth/login
POST /flydeck/api/v2/auth/logout
GET /flydeck/api/v2/workspaces
GET /flydeck/api/v2/workspaces/:workspaceId/trees/data
POST /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes
PATCH /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId
POST /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId/move
DELETE /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId
GET /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId/content
PUT /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId/content
PUT /flydeck/api/v2/workspaces/:workspaceId/trees/data/nodes/:nodeId/enabled
PUT /flydeck/api/v2/workspaces/:workspaceId/trees/data/selection
GET /flydeck/api/v2/workspaces/:workspaceId/cron
POST /flydeck/api/v2/workspaces/:workspaceId/cron
PUT /flydeck/api/v2/workspaces/:workspaceId/cron/:timerId
DELETE /flydeck/api/v2/workspaces/:workspaceId/cron/:timerId
GET /flydeck/api/v2/workspaces/:workspaceId/backup
POST /flydeck/api/v2/workspaces/:workspaceId/backup
```

All workspace routes require the opaque session cookie. Viewers can load DATA,
content, and CRON; mutations require `owner` or `editor`. Tree, node content,
per-user enabled state, selection, and CRON mutations use expected revisions.
Creation requests are idempotent for 24 hours via their UUID request ID.

## PostgreSQL backups

The Backup app starts `pg_dump` in PostgreSQL custom-archive format. The server
writes a `.partial` file with private permissions and only renames it to its
final `flydeck-<timestamp>.dump` name after a successful dump. Completed files
include size and SHA-256 status metadata. `BACKUP_DIRECTORY` selects the target
directory and `BACKUP_RETENTION` keeps the newest number of dumps (7 by
default). The deployed Flydon path matches `maintenance/scripts/pull-backup.sh`.

Flydeck deliberately provides no restore endpoint. Restore remains an offline
maintenance operation with `pg_restore` after the archive has been copied away
from the production device.

The CRON scheduler polls PostgreSQL every `SCHEDULER_INTERVAL_MS` and claims due
timers with row locks. Configure `NTFY_URL` and `NTFY_TOPIC` to send the same
ntfy-style notification as V1. Without ntfy configuration, due timers still
transition to expired without an external notification.

The server uses narrow REST messages. A complete flat tree is transferred only
for initial load or resynchronization. Create, rename, move, delete, enabled,
selection, and content changes have separate request schemas in
`@flydeck/shared/v2` and carry expected revisions.

## PostgreSQL integration test

Point the test only at a disposable, dedicated database:

```sh
FLYDECK_V2_TEST_DATABASE_URL=postgresql://... \
  npm test --workspace flydeck-backend-v2
```

Without that variable the migration integration test is skipped; HTTP and
contract tests still run. No SQLite or in-memory database substitutes for
PostgreSQL behavior.

## Optional login

`LOGIN_REQUIRED=false` is the default for personal and shared-family
installations. Requests then run as `AUTH_DEFAULT_USER_ID`; when it is omitted,
the oldest workspace owner is used. This is a shared identity and therefore
cannot attribute actions to individual family members.

For a multi-user installation, first set a password credential without putting
the password on the command line:

Fish:

```fish
read -s -P "New Flydeck password: " FLYDECK_NEW_PASSWORD
echo
set -x FLYDECK_NEW_PASSWORD $FLYDECK_NEW_PASSWORD
npm run set-password --workspace flydeck-backend-v2 -- <userId>
set -e FLYDECK_NEW_PASSWORD
```

Bash/Zsh:

```bash
read -rsp "New Flydeck password: " FLYDECK_NEW_PASSWORD
echo
export FLYDECK_NEW_PASSWORD
npm run set-password --workspace flydeck-backend-v2 -- <userId>
unset FLYDECK_NEW_PASSWORD
```

Then set `LOGIN_REQUIRED=true`. Login accepts the user's display name and a
password of at least four characters, stores only a salted Scrypt credential,
and returns an opaque
HttpOnly, SameSite=Strict session cookie. Set `AUTH_SECURE_COOKIE=true` behind
HTTPS. Restart backend-v2 after changing these settings.
