# Flydeck V2 — Client Consolidation and Backend Plan

Status: architecture review of 2026-08-03. V1 in `../frontend` and
`../backend` remains the productive reference until the V2 cutover criteria at
the end of this document are met.

## Goal

Flydeck V2 is a mobile-first, multi-user agent and workspace interface. The
client keeps the existing component-lab and Lego composition principles. A new
`backend-v2` uses PostgreSQL as its transactional source of truth and runs
independently from V1 during migration.

The rebuild must preserve the productive V1 behavior while making four
boundaries explicit:

1. domain data owned by the server;
2. semantic per-user state owned by the server;
3. small device-local UI state and unsent drafts owned by one client store;
4. transient interaction state owned by the nearest React component.

## How the V2 client currently works

### Boot and application composition

`src/main.tsx` loads the generated tokens, colors, and global base rules. It
renders the application normally and lazy-loads the development-only component
lab at `/lab`.

`App` is the composition root. It:

- resolves generated component properties and the active generated theme;
- provides the shared `Base` and `Button` configuration;
- composes `AppShell`, `AppTitle`, the primary module panel, and the active
  module;
- keeps `AGNT`, `DATA`, `FUNC`, `CRON`, `HELP`, and `CONFIG` mutually
  exclusive;
- remembers the previous primary module while HELP or CONFIG is open;
- manually resolves and passes the full property chain for all visible child
  components.

The generated component and theme files are authoritative design inputs. The
lab validates edits and writes those generated development files. This is a
developer design system, not runtime user configuration.

### Component model

Visible application components compose `Base`, directly or through an
application base component. CSS Modules own local styling. Shared controls such
as `Button`, `BrowserItem`, `ListControl`, `Textarea`, `InputControl`, and the
dial controls supply reusable behavior without reaching into child markup.

The dial implementation is already farther along than the old prompt assumed:

```text
DialSurface
└── Dialer
    ├── CronDialer
    └── ColorDialer
```

`DialSurface` converts pointer input into a normalized angle and phase.
`Dialer` owns inner/outer dial state, corner buttons, the center button, and
value selection. `ColorDialer` supplies its own scales and value conversion.
`Dialer` supports movable-pointer and fixed-north/rotating-wheel interaction
without changing its logical angle model. `CronDialer` specializes the wheel
mode with a time scale and a logarithmic one-hour to five-year range zoom that
keeps the selected timestamp at north.

### TreeBrowser

`TreeBrowser` renders one complete sibling list per visible depth. Selecting a
row appends either its child list or its content below the current list. Every
level independently owns paging and page size. Rows expose selection,
visibility/enabled state, content/list mode, guarded deletion, creation,
renaming, and ordering where permitted.

`TreeBrowserModel` currently stores one JSON document per composition in
`localStorage`. It persists:

- node structure, labels, flags, editability, and limits;
- `selectedPath`;
- page and page-size maps.

Runtime `data` attachments are deliberately stripped and reattached from the
current static definitions by stable node ID. This lets bundled FUNC fixtures
change without serializing executable/runtime attachments.

The selected state therefore **is already locally persisted**. It is not sent
to a server, is not scoped to a user/workspace/device, and has no conflict or
migration protocol beyond the single model version.

### Current module maturity

| Module | Current V2 behavior | Missing production behavior |
| --- | --- | --- |
| AGNT | CHAT placeholder; MEMO shows a locally persisted plant fixture | Chat API, conversations, prompt drafts, agent state, real memo tree and content |
| DATA | Generic tree with dummy categories and local UI state | Server projection, records/content, revisions, CRUD error/loading states |
| FUNC | Tree-backed DeviceInfo, Compass, and ShoppingList prototypes | Server catalog, persisted user functions/content, execution contract |
| CRON | North-anchored CronDialer time scale with logarithmic range zoom | Timer API, timer list, notifications, final action semantics |
| HELP | Bundled manual | Versioned help content if server-controlled help is later required |
| CONFIG | Connected empty module | Typed runtime settings projected through TreeBrowser |

V1 remains the behavior reference for chat, snippets, the editor and its phone,
medi, and character-dial keyboards, DATA CRUD, CRON timer editing/listing,
settings, server health, asynchronous chat updates, and safety interactions.

## Findings and required consolidation

The visual component architecture is healthy and well tested. The missing
foundation is not another visual primitive; it is a clear state and domain
boundary.

### P0: separate tree definition, domain document, and view state

The current `TreeBrowserModelNode` mixes several concerns:

- server-domain structure and content identity;
- mutable labels and ordering;
- semantic activation (`enabled`);
- device view mode (`contentVisible`);
- component constraints and runtime attachments.

This works for fixtures but is unsafe as the universal backend model. It also
has concrete failure modes:

- editor text is held privately by `InputControl` and is not persisted;
- a locally created FUNC node loses its `data` discriminator after reload;
- stored selection paths are not repaired when definitions change;
- IDs are assumed globally unique by recursive update helpers;
- the model is synchronous and tied directly to browser `localStorage`;
- it cannot hydrate from a server, expose loading/conflict state, or accept a
  controlled external update;
- `onTreeChange` reports nodes but not selection, paging, or revisions.

Replace that combined model with four contracts:

```text
TreeDefinition
  node kinds, capabilities, constraints, content renderer registry

TreeDocument
  server IDs, parent IDs, order, labels, domain payload references, revision

TreeSemanticState
  per-user enabled/context flags that affect server or agent behavior

TreeViewState
  selected path, pages, page sizes, list/content mode, scroll positions
```

`TreeBrowser` remains the renderer and interaction surface, but receives a
controlled snapshot and emits typed commands such as `select`, `create`,
`rename`, `move`, `delete`, `setEnabled`, and `setMode`. A hook/controller
decides whether a command is local, server-backed, optimistic, or forbidden.

Stable IDs must be UUIDs supplied by the server or a collision-safe client ID
for an unsynced node. Labels and paths are not identities. Every loaded
`selectedPath` must be validated from the root and truncated at the first
missing or inaccessible node.

### P0: make editor content controlled

`InputControl` cannot remain the source of truth for meaningful content. It
should support a controlled `value`/`onChange` contract; an optional local
uncontrolled mode is acceptable only for isolated lab examples.

The production editor composition should be:

```text
Editor
├── Textarea
├── EditorActions
├── CursorControls
└── Keyboard
    ├── Button keys
    └── CharacterDialer -> Dialer -> DialSurface
```

CRON and the character input dial share `Dialer` and `DialSurface`, while
remaining separate specialized controls. The V1 `Editor` is the behavioral
inventory, not code to copy wholesale. Migrate one keyboard at a time with its
cursor, temporary-input, virtual-viewport, dictation, touch, and accessibility
tests.

### P0: introduce one client state service

Create a typed `ClientStateStore`; components must no longer invent storage
keys or call `localStorage` directly. Use `useSyncExternalStore` (or a thin
equivalent hook) to connect React.

The requested unified local storage should use a single versioned namespace:

```text
flydeck:v2:<user-id>:<workspace-id>:<device-scope>:<slice>
```

It needs:

- a registry of typed slices and defaults;
- schema version and deterministic migrations per slice;
- guarded parsing, quota/error reporting, and reset by scope;
- same-tab subscriptions and `storage` event handling for other tabs;
- immediate local draft writes; canonical DATA synchronization is independent
  of input timing and runs through the workspace replica outbox;
- explicit cleanup on logout and account switching.

Keep small preferences, navigation state, and unsent drafts in localStorage as
requested. Do not store session tokens there. Canonical DATA does not become a
larger `ClientStateStore` slice: it belongs to a separate `WorkspaceReplica`
with an asynchronous IndexedDB adapter, transactional outbox, and global sync
status. APPS read projections and issue commands through that replica instead
of owning caches or server requests. Binary data belongs to a separate blob
store referenced by DATA records.

Status: authenticated user/workspace/device scoping and the transactional
`WorkspaceReplicaStorage` contract with a test memory adapter were implemented
on 2026-08-11. The production IndexedDB adapter is implemented as the first
durable backend. `WorkspaceReplica` now exposes one observable in-memory
snapshot per user/workspace, hydrated once from IndexedDB; DataBrowser and APPS
render only those snapshots. `WorkspaceSyncEngine` is the sole canonical DATA
backend boundary: it refreshes trees, hydrates requested content, and publishes
every result back through the replica. Transport availability is global:
offline state uses a blue Flydeck wordmark/logo plus the `Offline` title
message without changing the title background. Inventory reads the same
projection. DataSource paths are validated synchronously against the in-memory
tree on every input change, without a debounce or server request. All DATA
mutations now have request IDs and
an atomic backend idempotency boundary, while create uses a client-assigned
node ID. The replica persists and deduplicates typed outbox entries; dispatch,
optimistic projection, and automatic replay are implemented for Inventory.
The sync engine serializes replay per user/workspace and retries registered
scopes when connectivity returns. DataBrowser now uses the same command path
for every tree, semantic, selection, and content mutation, completing the
offline DATA writer migration.

The title actions include a deliberate Offline test toggle before Help. It
uses the same global transport boundary as real connection failures rather
than faking component state. Its off state shows `WifiOff`; its on state shows
the aggregated pending Outbox transaction count. Turning it off triggers
registered-scope replay immediately.

Recommended ownership:

| State | Authority | Scope |
| --- | --- | --- |
| active module/submodule, page sizes, content/list mode | client store | device + user + workspace |
| unsent prompt/editor/title text | client store first; optional server draft | device + user + workspace |
| TreeBrowser selected path | server, cached locally | user + workspace + tree |
| row enabled for agent context | server semantic state | user + workspace + node |
| shared tree nodes, labels, order, content | server domain data | workspace |
| auth session | secure HttpOnly cookie | browser session |
| pointer drag, delete armed timeout, pending button | component | current render/session |

Paging can stay device-local. Selection is server-persisted because the desired
behavior is to continue on another device. On initial load, show cached state
immediately, then reconcile with the server revision. Server state wins unless
the local state contains a newer acknowledged mutation.

### P1: keep runtime configuration separate from the lab

CONFIG may use TreeBrowser visually, but it must not edit generated component
JSON/CSS. Define a typed runtime settings catalog with categories, setting
keys, value schemas, defaults, scope (`device`, `user`, or `workspace`), and a
renderer/editor kind. Project that catalog into TreeBrowser nodes. Persist
actual values through the client state service or backend according to scope.

The component lab continues to own developer-only design configuration and is
excluded from production.

### P1: reduce the App composition root

`App.tsx` currently performs hundreds of lines of manual derived-property
resolution. Keep property resolution explicit, but move each stable component
family into a typed configuration hook/provider:

- button family;
- browser family;
- input/editor family;
- dial family;
- module family.

Do this only after the public contracts above are stable. The goal is to make
`App` describe module composition and navigation, not to hide dependencies in
a general service locator.

### Parallel browser implementations — resolved

`MemoryBrowser` now specializes `TreeBrowser`; the overlapping `EntryBrowser`
implementation and catalog contract were removed during Phase 1.

## Backend V2 architecture

### Repository and process boundary

Add a new workspace without altering V1:

```text
backend-v2/
├── src/app/             # composition, lifecycle, HTTP server
├── src/auth/            # sessions, users, authorization
├── src/db/              # PostgreSQL pool, SQL migrations, transactions
├── src/modules/         # tree, data, memo, chat, cron, config
├── src/agent/           # Codex execution and workspace isolation
├── src/jobs/            # durable worker, timer and notification dispatch
├── src/http/            # middleware, errors, request IDs, SSE
└── test/                # unit, PostgreSQL integration, contract tests
```

Stay with TypeScript, Node, Express 5, and Zod unless a measured limitation
appears. Use PostgreSQL through a small typed query layer and checked-in SQL
migrations. Domain services must not depend on Express request objects.

The first deployment may run HTTP and the job worker in one service, but they
must have separate lifecycle classes so a worker can become a second process
without redesigning the domain.

### API contract

Use `/flydeck/api/v2`. Keep Zod request and response schemas in a shared V2
contract package imported by both client and server. Never share database row
types with the client.

Every mutation uses:

- authenticated user and selected workspace context;
- an idempotency key for create/send operations;
- an expected resource revision for edits, moves, and deletes;
- a PostgreSQL transaction;
- a stable JSON error envelope with code, message, request ID, and optional
  field/conflict details.

Use cursor pagination for unbounded server collections. SSE is appropriate for
chat run updates and timer/job events. Normal CRUD remains request/response.

Initial route groups:

```text
GET       /auth/session
POST      /auth/login, /auth/logout
GET       /workspaces
GET/PATCH /workspaces/:workspace/ui-state/:key
GET       /workspaces/:workspace/trees/:tree
POST      /workspaces/:workspace/trees/:tree/nodes
PATCH     /workspaces/:workspace/nodes/:node
POST      /workspaces/:workspace/nodes/:node/move
DELETE    /workspaces/:workspace/nodes/:node
GET/PUT   /workspaces/:workspace/nodes/:node/content
GET/POST  /workspaces/:workspace/conversations
GET/POST  /workspaces/:workspace/conversations/:id/runs
GET       /workspaces/:workspace/conversations/:id/events
POST      /workspaces/:workspace/runs/:id/cancel
GET/POST  /workspaces/:workspace/timers
PATCH/DELETE /workspaces/:workspace/timers/:id
```

The TreeBrowser is a client projection, not itself a business-domain API.
DATA, MEMO, FUNC, and CONFIG may return compatible tree documents, but their
commands must still pass domain authorization and validation.

### PostgreSQL data model

Use UUID primary keys and `timestamptz`. Every workspace-owned row carries a
`workspace_id`; every user-specific row carries `user_id`. Add composite
foreign keys or service-level assertions so an object from one workspace
cannot be attached to another.

Foundation tables:

- `users`, `user_credentials`, `sessions`;
- `workspaces`, `workspace_memberships`, `devices`;
- `schema_migrations`, `idempotency_keys`, `audit_events`.

Tree and content tables:

- `trees(id, workspace_id, kind, revision, ...)`;
- `tree_nodes(id, tree_id, parent_id, kind, label, local_id, position, revision, ...)`;
- `node_contents(node_id, format, content, revision, ...)`;
- `node_user_states(node_id, user_id, enabled, revision, ...)`;
- `tree_user_states(tree_id, user_id, selected_path, revision, ...)`;
- `user_settings` and `workspace_settings` with typed keys and JSON values.

Use an integer `position` initially and reorder siblings in one transaction.
Only adopt fractional ordering if measurements show that whole-sibling updates
are a problem. A recursive CTE can validate paths and subtree operations.
The UUID `id` remains the immutable relationship key. `local_id` is a
sibling-unique user address with separate unique indexes for root and nested
lists. Generated IDs are short, while manually chosen IDs may be longer.
User-facing parent and data-source paths resolve `local_id`
segments, so label edits never invalidate them.

Chat tables:

- `conversations`, `messages`, `agent_runs`, `agent_run_events`;
- `codex_thread_id`, model choice, reasoning effort, token usage, status,
  cancellation request, request id, and timestamps;
- one active queued/running run per conversation enforced by a partial unique
  index.

CRON and job tables:

- `timers` with owner, workspace, title, due time in UTC, originating time zone,
  status, and revision;
- `jobs` for durable claim/retry state;
- `notification_outbox` for ntfy or later transports;
- unique idempotency keys for timer creation and notification delivery.

Workers claim due rows with `FOR UPDATE SKIP LOCKED`, commit the claim, perform
the external action, then record success or a bounded retry. Timer expiry and
notification delivery must not depend on an in-memory interval alone.

### Multi-user authentication and authorization

`AUTH_MODE=off` is acceptable only for local development. Multi-user production
requires authentication from the first backend-v2 vertical slice.

Use Secure, HttpOnly, SameSite cookies containing an opaque random session ID;
store only the session hash in PostgreSQL. Rotate the session on login and
privilege changes, expire idle and absolute lifetimes, and enforce origin/CSRF
checks on mutations. Password credentials, if used, must be Argon2id hashes;
passkeys can be added without changing the session model.

Authorization is membership-based (`owner`, `editor`, `viewer`) and checked in
the service layer for every workspace resource. Database row-level security can
later add defense in depth, but it must not be the only authorization layer.

### Agent isolation is a hard security boundary

A `workspace_id` must resolve to an allow-listed filesystem root. Never accept a
working directory from an HTTP request. Running every user's Codex process as
the same unrestricted Linux account would defeat database tenancy.

Before public multi-user release, choose and test one isolation mechanism:

1. dedicated Unix user per workspace plus a small privileged launcher with a
   strict allow-list; or
2. rootless container per workspace with only that workspace mounted.

The second option is the recommended target. Agent runs receive bounded CPU,
memory, duration, and output size; cancellation must terminate the complete
process/container tree. Secrets are injected per workspace and never included
in chat events or logs.

### PostgreSQL versus readable workspace files

PostgreSQL is authoritative for shared application state, users, trees, chat,
timers, and configuration. Do not dual-write the same record to PostgreSQL and
Markdown as equal authorities.

If human-readable files remain desirable, implement deterministic import and
export jobs:

- import V1 Markdown/JSON-lines and the SQLite chat store once;
- export selected DATA/MEMO resources to workspace files with a recorded source
  revision;
- reject or explicitly reconcile an edited export instead of silently
  overwriting either side.

This preserves readable backups without creating an unsolvable two-master
system.

## WireGuard and the public server

WireGuard is an operating-system network layer. A browser client cannot create
or repair WireGuard handshakes, manage peer keys, or switch the phone's tunnel.
That behavior belongs to the phone's WireGuard app/OS and server provisioning.

For the reliable first version, use the public server as a small WireGuard hub:

```text
phone/browser
    |
    | HTTPS to one stable origin
    v
public server (TLS reverse proxy + WireGuard hub)
    |
    | private WireGuard address
    v
home Flydeck backend-v2
```

Both the home server and phone keep outbound-compatible WireGuard peerings to
the public hub; NATed peers use a suitable persistent keepalive. The public
reverse proxy forwards only the Flydeck origin over WireGuard. PostgreSQL,
Codex credentials, workspace files, and application backups stay off the public
server.

This topology is less clever and more reliable than a custom rendezvous and
direct-peer fallback. If direct phone-to-home routing is later worth the
complexity, add a signed rendezvous/control service as an optimization. Do not
invent a new cryptographic handshake. The fallback path should remain the hub,
and its health/bootstrap endpoint must reveal no private keys or application
data.

Use one canonical HTTPS origin in the browser. Avoid switching between private
and public origins because it splits cookies, local storage, service workers,
and CORS behavior.

## Backup and operations

Backend-v2 needs operational behavior before it receives production data:

- structured logs with request, user, workspace, and run IDs but no prompt or
  secret bodies by default;
- `/health/live` and `/health/ready`, with readiness checking migrations and
  PostgreSQL connectivity;
- metrics for request latency/errors, DB pool, queued/running jobs, timer lag,
  agent duration, SSE clients, and notification retries;
- daily encrypted PostgreSQL backups plus retained WAL/point-in-time recovery
  when the data becomes important;
- separate backup of workspace files and deployment configuration;
- automated restore tests into an isolated database;
- migration rollback/forward procedure and a documented key-rotation process.

The public WireGuard hub has a reproducible configuration backup, but contains
no authoritative Flydeck user data.

## Delivery plan

Each phase is a vertical, independently testable slice. Do not build all schema
and abstractions before a real module uses them.

### Phase 0 — freeze contracts and reference behavior

- Capture V1 screenshots and a behavior inventory for CHAT, DATA, CRON,
  keyboards, settings, loading/error, and destructive states.
- Record four architecture decisions: PostgreSQL authority, workspace tenancy,
  server-synced tree selection, and public WireGuard hub.
- Add contract fixtures for the V2 error envelope, auth session, tree document,
  and revision conflict.

Exit: the same interaction is not interpreted differently by client and server
implementers.

### Phase 1 — client state and TreeBrowser consolidation

Status: completed on 2026-08-03.

- Add `ClientStateStore` with typed slices, migrations, namespacing, and tests.
- Persist active module/submodule and unsent controlled input drafts.
- Split TreeBrowser definition/document/semantic/view state.
- Make `InputControl` controlled and repair invalid stored selection paths.
- Migrate `MemoryBrowser` to TreeBrowser; retire `EntryBrowser` after parity.

Exit: refresh never loses an unsent draft or valid navigation state; created
nodes retain their type; no production component calls localStorage directly.

### Phase 2 — backend-v2 foundation

Status: in progress since 2026-08-03. Shared narrow REST contracts, the
independent workspace, initial PostgreSQL migration, request/error boundary,
health endpoints, opaque-session lookup, and protected workspace listing are
implemented. A disposable PostgreSQL server is still required to exercise the
migration integration test.

- Create the workspace, PostgreSQL test harness, migration runner, request IDs,
  error middleware, auth sessions, users, workspaces, and memberships.
- Add CI tests against a real temporary PostgreSQL database.
- Implement idempotency and optimistic revision helpers once, with integration
  tests for cross-workspace denial and concurrent writes.

Exit: two users in two workspaces cannot read or mutate each other's resources.

### Phase 3 — DATA as the first end-to-end slice

- Implement a DATA tree projection, node content, CRUD, ordering, trash, and
  revision conflicts.
- Connect `DataBrowser` through a controller/repository while retaining cached
  local selection and drafts.
- Import representative V1 Markdown, test multiline records, and provide an
  explicit export.

Exit: DATA is productive in V2 for two users and survives refresh, a second
device, concurrent edits, backend restart, and restore from backup.

### Phase 4 — editor keyboards, MEMO, and chat

- Migrate Editor, Keyboard, and CharacterDialer behavior.
- Implement real MEMO nodes/content and per-user enabled context.
- Port chat conversations, messages, runs, idempotent send, SSE updates,
  cancellation, restart recovery, and model/effort settings to PostgreSQL.
- Add the chosen workspace agent isolation before enabling the second user.

Exit: an agent receives only the authorized workspace and enabled memo context;
drafts survive locally and completed history is server-authoritative.

### Phase 5 — CRON and notifications

- Design the production CRON interaction model and accessible alternatives from the generic Dialer basis.
- Add title input and the timer list next to/below the creation control at phone
  width according to the established module composition.
- Implement durable timers, job claiming, ntfy outbox, retries, editing,
  deletion, and expired history.

Exit: a backend restart or duplicate worker cannot lose or duplicate a timer
notification.

### Phase 6 — CONFIG and FUNC

- Define the typed settings catalog and TreeBrowser projection by scope.
- Replace bundled FUNC response fixtures with server-provided typed data.
- Persist user-function source and define execution permissions before allowing
  server execution.

Exit: runtime configuration is multi-user and never modifies lab-generated
source files; FUNC content survives reload and is authorization-checked.

### Phase 7 — network, deployment, migration, and cutover

- Provision the public WireGuard hub, TLS reverse proxy, firewall, rate limits,
  and canonical origin.
- Rehearse PostgreSQL/SQLite/Markdown imports and rollback.
- Run V1 and V2 side by side, compare all inventory states, complete mobile
  accessibility and visual-viewport tests, and perform a restore drill.
- Commit and tag the final V1 state before switching traffic.

Exit: the production URL can move to V2 with a tested rollback and without
changing or deleting V1 data.

## Immediate next implementation slice

Phase 1 is complete and the first Phase 2 foundation is present. Continue
without coupling V1 to the new backend:

1. provision an explicitly disposable PostgreSQL test database and run the
   idempotent migration integration test;
2. choose password bootstrap or passkey enrollment and implement login/logout
   without adding a development authentication bypass;
3. implement workspace authorization middleware and the initial flat tree-load
   query;
4. add one narrow enabled-state mutation with optimistic revision handling;
5. prove cross-workspace denial, idempotency, and revision conflicts before
   adding the remaining DATA CRUD commands.

The consolidated client types are the input to these DTOs; database row types
must remain private to backend-v2.

## V2 cutover definition

V2 is ready to replace V1 only when:

- CHAT, MEMO, DATA, FUNC, CRON, CONFIG, HELP, and all required input methods
  have a documented parity/deviation decision;
- no meaningful user input exists only in transient component state;
- multi-user authorization and agent filesystem isolation have adversarial
  tests;
- PostgreSQL migrations, backups, and restores are exercised;
- the canonical WireGuard-backed HTTPS path is monitored;
- V1 and V2 still build independently and the V1 rollback has been rehearsed;
- build, lint, tests, accessibility checks, and whitespace checks pass.
