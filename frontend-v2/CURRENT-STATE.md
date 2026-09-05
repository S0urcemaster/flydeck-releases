# Flydeck Frontend V2 — Current State

This is the short-lived handoff document for a fresh agent context. Durable
rules belong in `AGENTS.md`; architecture and migration intent belong in
`rebuild-plan.md`.

## Implemented application surface

- `BlockingDialog` remains the reusable modal interaction boundary for initial
  session loading and login. Synchronization failures no longer open a modal or
  make `AppShell` inert; they remain visible in the noninteractive
  `AppStatusLine` while the cached application state stays usable.
- Application startup reads `/auth/session`. After one second it releases the
  initial loading gate even without a server response and continues with the
  cached identity or anonymous/default replica scope. `LOGIN_REQUIRED=false`
  enters through the configured local server identity; required login opens
  `LoginDialog`.
- The last confirmed user/workspace IDs (never the session token) locate the
  matching local replica during an offline start. Transport failures publish
  one global workspace sync status: `AppTitle` colors only its Flydeck wordmark
  and logo with the blue primary accent and its status line reads `Offline`;
  the title background is unchanged. A later successful API response clears
  offline state.
- `ModuleMenuActions` places an Offline test toggle immediately left of Help.
  In its online state it renders the `WifiOff` symbol. Both a real connection
  failure and enabled test mode select the button and replace that symbol with
  the global number of pending Outbox transactions. Test mode blocks every V2
  API request before transport and therefore exercises the real
  cache/optimistic/outbox path. Disabling it releases transport and immediately
  retries every registered workspace scope.
- `DeleteButton` now acquires an immediate in-flight guard before invoking an
  asynchronous delete. It remains disabled until that promise settles. This
  local destructive-action lock is independent from global synchronization
  status.

- `App` composes `AppShell`, `AppTitle`, `ModulePanel`, and the active module.
- The APPS browser's System branch contains `Backup`. Selecting it renders
  `BackupApp` directly below its list item through the generic
  `TreeBrowser.renderInlineContent` slot; it does not create a top-level app
  tab. The view starts a server-side PostgreSQL custom-format dump and shows
  idle, running, saved, or failed state in `AppStatusLine`. Restore is excluded
  from the application and remains a maintenance-computer operation.
- `Button` is the shared selected/disabled button control. `ModulePanel` and the
  AppShell viewport simulation compose it instead of styling raw buttons.
- `ModuleButton` composes `PressButton` and is parameterized by label and
  symbol. `ModulePanel` renders AGNT, DATA, a B/C/D data-slot cycle, and APPS
  directly as four
  instances of that one component; the former empty wrapper components and
  their duplicate persisted contracts have been removed.
- The ModuleButton lab editor displays its composition chain explicitly:
  `ModuleButton.symbol` → `PressButton` → `Button.activeColor` → `Base`.
- `Button.activeColor` owns its selected-state accent. Module buttons use the
  blue `ACCENT_ONE`; green `ACCENT_TWO` is reserved for a subordinate control
  level rather than alternating within the module level.
- The theme contract also exposes brown `ACCENT_THREE`; Flydeck V2, the V1
  reference palette, and Greyscale each provide a corresponding value.
- `SubmodulePanel` owns controlled subordinate navigation and composes
  `SubmoduleButton` for `JOBS` and `MEMO`. `SubmoduleButton` derives the full
  persisted `Button.base` contract, including its configured 40px height, and
  uses green `ACCENT_TWO` for selection. Both are independently catalogued.
- `Textarea` is the shared multiline control used by `FunctionsModule` and the
  lab property editor.
- The shared module-menu state keeps `AGNT`, `DATA`, `DATB`, `DATC`, `DATD`,
  `FUNC`, `HELP`,
  and `CONFIG` mutually exclusive. The active module, previous primary module,
  and AGNT submodule are persisted through the unified client state store.
- `ModuleMenuActions` renders the symbol-only `HelpModuleButton` and
  `ConfigModuleButton` in the `AppTitle` action slot while sharing the same
  controlled menu state as `ModulePanel`.
- `HelpModuleButton` and `ConfigModuleButton` derive from the shared
  `SideModuleButton`, which derives from `ModuleButton` and owns the
  `BUTTON_WIDTH` override. The concrete side buttons inherit that width.
- `Module` is the shared base surface for `AgentModule`, `DataModule`,
  `FunctionsModule`, `HelpModule`, and `SettingsModule`.
- Concrete module properties resolve `inherit` against the configured
  `Module.base`, so border, background, spacing, and color form one shared
  module body unless a concrete module overrides them.
- The CRON module and CronDialer are archived under `parked/Cron` and are absent
  from application navigation, production builds, tests, and the component lab.
  `Dialer` remains active for other controls.
  `SettingsModule` remains an empty migration target. `AgentModule` owns
  subordinate `JOBS` and `MEMO` navigation. Both use persistent workspace-tree
  projections and suppress the complete global TreeBrowser path/search
  menu. `MEMO` is the server-backed `_system/agnt/memo` root and edits real
  workspace nodes through the replica. Its default system-memory branch is
  `_system/formatting/output/treebrowser`; the leaf tells agents to produce a
  structured tree list using repeated `|-` indentation. `JOBS` uses
  `_system/agnt/jobs` without a separate type
  switch. Adding a manual child makes an unsaved item a group; saving JobCase
  fixes it as a job, whose children are then reserved for run dates and runs.
  A group can expose JobCase again only after its manual child list is empty.
  A job's ID, Name, and Parent remain collapsed behind the full-width `Details`
  control. The always-visible `JobCase` has `MEMO`, `DATA`, `PRMPT`, and
  `IMPRT` tabs, followed by Start at its lower edge directly before the
  always-rendered Runs
  browser, including when it has no entries. MEMORY is an editable textarea.
  The persistent explicit multi-selection in the MEMO browser has no implicit
  descendants; `Set Memory` snapshots the currently checked MEMO nodes into
  an ordered textarea draft, which can then be edited independently and saved
  through that field's keyboard action. The per-job MEMORY draft uses the
  scoped client-state store, so a newly assembled or edited value survives tab
  switches and reloads until it has been saved successfully. MEMORY, DATA, and PROMPT use editable
  textareas; `Set Datasources` snapshots every selected DATA root together with
  its ordered descendant structure and contents using repeated `|-` indentation.
  MEMORY and DATA use double-height
  textareas. All textareas initially select the keyboard's `S` font stage.
  DATA also retains its one-level four-item source list resolving
  only normal DATA-tree IDs/paths. PROMPT owns the keyboard Save action and the
  persisted model/effort cycles and the one-shot schedule. `IMPRT` accepts a
  repeated-`|-` tree, validates it after a two-second edit pause, and shows
  either a local preview or the parser error. Its source text is retained per
  job in scoped client storage across tabs, jobs, and browser reloads. Its
  red/green `setParent` field
  resolves a DATA UUID, globally unique local ID, or path; an empty value means
  the DATA root. Import then creates the previewed nodes and their plain-line
  contents recursively through the normal optimistic DATA command queue. Its
  preview has a 16rem minimum height, its selected `IMPRT` tab is success-green,
  and the unrelated job Start action is hidden while this tab is active.
  JobCase ignores the
  outer TreeBrowser's dynamic content height and top-aligns its rows, so tabs
  cannot stretch Details or their controls to different heights.
  Runs are persisted as `job → YYYY-MM-DD → HH:mm · status` tree nodes. Start
  snapshots ordered memory, DATA selections, prompt, model, and effort before
  sending the saved `MEMO → Datasources` text as Codex developer/system
  instructions and Prompt alone as user input. One queued/running run per job
  is enforced in PostgreSQL. While a
  run is active JobCase editing is locked. Cancel unlocks editing immediately,
  keeps Start disabled until the cancel request is resolved, aborts Flydon, and
  fences all late output with the terminal database status. Completed, failed,
  cancelled, and interrupted run content uses the ordinary keyboard-backed
  ContentEditor. Job deletion is immediate because the normal TreeService
  operation first moves the complete branch to `_trash`, from which it can be
  reparented.
  `HelpModule` renders `src/assets/manual.md`.
  `HelpModule` and `SettingsModule` are connected to the HELP and CONFIG title
  actions respectively.
- AGNT/MEMO uses the standard `TreeBrowser` directly, including its standard
  checkbox selection. Parent/child check cascading is retained for composing
  Job Memory. The overlapping `EntryBrowser` implementation remains removed.
- `TreeBrowser` is the recursive tree-navigation base currently shown directly
  under `AGNT` → `MEMO` with a plant-inheritance fixture. A virtual client-only
  `root` owns the first list; it has no editable ID, parent, or content and
  requires no backend node. Each visible level owns a list control and a
  fixed-size page whose shared default is four items. Selecting one
  row appends exactly one child level below the complete current list; leaf
  selection appends the same five-row level as an empty list. There is no tree
  indentation and no child list is inserted beside or immediately after its
  parent row.
- `BrowserItem`, `Checkbox`, and `ListControl` own the reusable row, action
  selection, and paging UI respectively. All are independently catalogued and
  have persisted Base properties. Checkbox additionally owns its mark
  `fontSize`; editing it in the lab no longer mutates the inherited global
  Button typography. Lab navigation and action buttons inherit the configured
  Button height, so typography previews cannot resize the lab chrome.
- `BrowserItem` now contains only its checkbox and label; it owns no destructive,
  ordering, paging, or mode controls. Selecting an editable item replaces that
  row with the existing keyboard-backed name input while retaining its numbered
  action-selection checkbox immediately before that input. Each `ListControl`
  precedes its own list or content in normal document flow. Its left label names
  that list/content owner (`root` at the first level); move and paging act on
  that owner's own child list. Its default level
  contains the owner label button at the left, followed by move-up/down,
  previous/next-page, and finally the list/content switch at the far right.
  The elementary list/content switch is twice the standard button width and
  keeps standard horizontal padding. Its current-mode icon aligns left while
  content is visible and right while the child list is visible. It stays
  permanently highlighted with the opposite of the current tree level's
  alternating green/blue active color and changes mode immediately on press. The global
  Clicking the owner label now opens the keyboard-backed `New` input for that
  child list, including an empty list. A created item is inserted after the
  active sibling or at the list end when no sibling is active. Delete travels
  with the active child and sits directly beside that child's name input. The
  global Search input and every New-item/name input focus immediately when
  opened; selecting an existing item still does not focus its rename input.
  selected-item keyboard exposes only `Save`; it no longer combines rename and
  creation. `New` is enabled only for a non-empty name that does not already
  exist case-insensitively. The list-size switch is parked and no longer appears.
  Page sizes are no longer a local-only authority: DATA loads them from the
  per-user server tree state and every change travels through the same
  revisioned optimistic replica/outbox as the selected path. Existing V2
  IndexedDB replicas migrate to this server-backed shape without losing queued
  commands.
  APPS/System contains `Maintenance` directly before `Backup`. Its
  `Reset Client to Server` action is an explicit recovery escape hatch: it
  first loads the server tree, then discards the complete local replica outbox,
  cached contents, and workspace image drafts. A failed server read leaves the
  client cache untouched.
  A global TreeBrowser menu precedes every level. Its permanent first row shows
  the current slash-separated local-ID path followed by the Search symbol. Search
  reuses that input, filters the complete tree, and retains matching ancestor paths.
  The sticky menu and input use the opaque `COLOR_APP` background.
  DATA and the cycled DATB/DATC/DATD slots share the same replica data but keep
  their `selectedPath` locally in the client under separate scoped keys. Path
  navigation no longer submits a server selection mutation.
  `TreeBrowser` supplies the selected-row color by depth, alternating from
  `ACCENT_ONE` to `ACCENT_TWO`.
  Selecting a row makes it the only active item in its sibling list and checks
  it for actions. Further siblings can be added or removed through their
  checkboxes without opening them; the active row remains checked. Navigating
  to another parent preserves the checked sets owned by all other parent lists,
  including navigation through the shared path/search input. Delete and
  Set Parent apply to the complete checked sibling set, and Set Parent validates
  target capacity for the whole batch.
  Checkboxes display each item's one-based position in the complete sibling
  list. Every list has a hard 99-item ceiling even when its domain-specific
  `listItemLimit` is absent or larger.
  ListControl page and page-size changes never alter `selectedPath`; an active
  item and its descendant list/content remain active even while another page
  of the owning list is visible. ListControl button surfaces carry a fine,
  low-contrast 8px square grid over their normal background and active colors.
- `DataBrowser` and `FunctionBrowser` specialize `TreeBrowser` and are shown
  in DATA and FUNC. `DataBrowser` renders the workspace replica's canonical
  DATA tree. Its item content keeps the content editor permanently visible and
  collapses ID, Name, Parent, and Sharing behind one full-width Details row.
  The content textarea has a 13em minimum height (twice its previous minimum),
  while the TreeBrowser-derived item height is now only a minimum rather than
  a fixed cap, so content and opened details can expand naturally.
  The first Details row is a one-dimensional 0–359-degree pastel rainbow
  slider with a final neutral position. Its nullable hue is canonical node
  state and is committed only by the common item Save. Slider changes preview
  immediately on the item's label and checkbox button surfaces. While the
  pointer holds the slider, the item's normal selected accent is suppressed so
  that preview remains visible; releasing it restores selection without losing
  the draft. A saved hue replaces those buttons' normal gray background.
  Sharing is workspace-canonical DATA state: its wider leading checkbox and
  form save the active flag and public share name with the common item Save;
  Unshare retains the name for later reuse. Sharing a child disables shared
  ancestors, while sharing a parent disables every shared descendant. The
  server performs that exclusivity change atomically and the optimistic replica
  applies the identical cascade immediately. An active share is rejected by
  the client, shared Zod contract, service, and PostgreSQL constraint unless
  its name is present. Its checkbox labels the inactive and active states
  `Share` and `Shared`. System/trash branches cannot be shared.
  Selecting, capturing, or pasting an image while the item Content textarea is
  focused creates the same local image draft and preview. The normal Content
  keyboard `Save`, every Save action in the item's detail fields, and the
  permanently visible item `Save` all commit the complete valid item draft:
  ID, Name, Parent, Sharing, Content, and image. Selecting or pasting an image
  activates the visible item Save immediately, without requiring textarea
  focus. DATA-item inputs suppress the optional keyboard Save action, leaving
  that row available to the keyboard's other controls. Save is disabled once
  no unsaved item change remains. Changed text and
  images use the existing DATA write queue. The original Blob
  remains in the separate IndexedDB image store until server confirmation.
  There is no waiting dialog; a dialog with Retry appears only after queue
  failure.
  Removing an image uses the shared armed `DeleteButton`: the first press arms
  it for the configured timeout and only the second press deletes. DeleteButton
  uses the orange `COLOR_SPEECH` background at rest and the configured error
  color while armed.
  `FunctionBrowser` starts with `Widgets`, `System`, and `User`; `System`
  contains a `DeviceInfo` item. `Widgets → Compass` builds category lists from
  `assets/sayings.json`, with the matching sayings below every category; the
  JSON is temporary frontend data until the backend supplies it. Widget nodes
  compose `InputControl` in content mode; saying leaves initialize its textarea
  with their complete text, while container content starts empty. Widget and
  user inputs receive the shared `InputControl → Textarea → Base` properties;
  switching the selected node displays its node-scoped persisted draft.
- `ClientStateStore` is the single browser-storage boundary. It owns versioned,
  validated slices under a user/workspace/device namespace, same-tab
  subscriptions, cross-tab storage events, and non-destructive migration from
  the previous `flydeck.tree.*` keys. `App` now supplies the authenticated user
  and workspace plus one persistent browser-device ID through
  `ClientStateScopeProvider`; descendant slices no longer collapse into the
  previous anonymous/default scope. No other production source accesses
  `localStorage` directly.
- Canonical DATA is separated from that UI/preference store. The
  `WorkspaceReplicaStorage` contract defines user/workspace isolation,
  revisioned tree/content records, a typed mutation outbox, sync status, and
  atomic transactions. Its tested memory adapter is the deterministic test
  boundary; the production IndexedDB adapter stores each replica in a single
  read/write transaction. `WorkspaceReplica` owns one observable in-memory
  snapshot per user/workspace, hydrates it once from IndexedDB, and publishes
  transactional changes through `useSyncExternalStore`. DataBrowser and APPS,
  including Inventory, read only that snapshot and never fetch canonical DATA
  directly. `WorkspaceSyncEngine` is the sole DATA backend boundary: it
  refreshes trees, hydrates requested node content, publishes confirmed data,
  and retries desired content after connectivity returns. Offline mutation
  queuing is active through that same replica.
- Every shared DATA mutation contract now carries a UUID request ID, including
  create, rename, move, reparent, delete, enabled state, sharing, selection, and content.
  Create additionally carries its client-assigned node UUID and sibling-local
  short generated `localId`, so an offline item has both a stable internal identity
  and an address before server contact; users may later choose a longer ID. Backend tree routes execute
  each non-create command through a transaction-scoped idempotency boundary;
  mutation and recorded response commit atomically, repeated IDs replay the
  original response, and cross-operation ID reuse is rejected. Create retains
  its existing stored-response path and now serializes concurrent repeats with
  the same advisory lock. `WorkspaceReplica` can durably enqueue, deduplicate,
  count attempts, and acknowledge typed commands.
- `WorkspaceSyncEngine` now owns serialized per-workspace replay, dispatches
  every typed DATA command through `V2ApiClient`, retains failed entries,
  records attempts, acknowledges confirmed responses, and refreshes the tree
  after a drained queue. Normal writes use a five-second trailing write-behind
  window: every action is durable and visible locally at once, while server
  replay starts only after five quiet seconds. Commands atomically rebase their
  expected tree/node/content revision when entering the replica, so rapid
  ordered actions cannot share a stale component revision. App startup
  registers the last confirmed workspace;
  browser `online` events retry every registered scope. Inventory is the first
  complete optimistic writer: New, Name, Desc, and Parent update DATA plus
  outbox in one IndexedDB transaction, immediately re-project from the replica,
  and use the same path whether online or offline.
- `V2ApiClient` reads response bodies explicitly before decoding JSON. Empty or
  malformed server/proxy responses now become typed retryable
  `SERVICE_UNAVAILABLE` errors with HTTP status and request ID instead of
  leaking a browser `JSON.parse` exception. Outbox commands therefore retain
  their idempotent request ID and remain safely retryable after such a response.
- `WorkspaceSyncEngine.submit` returns the durable optimistic replica record
  immediately after that single local transaction. Server dispatch, outbox
  acknowledgement, and the final confirmed-tree refresh continue in the
  background, so DATA selection and editing no longer wait for network replay.
  DataBrowser keeps one mounted TreeBrowser and reconciles changed replica
  models in place instead of key-remounting the complete tree after every
  revision. Every replica snapshot now supplies a fresh canonical model
  definition, so optimistic ID and name changes immediately reach the parent
  list and ListControl as well as the Inspector. Because DATA manages the
  structure externally, this definition update preserves the open path, page,
  and content mode. Conflict recovery replaces the observable replica from the
  server without reloading the browser page.
- The title status line visualizes durable writes in the blue primary accent.
  Each user command shows `cached...` for at least 500ms and then `saved`; while
  offline it transitions to `in queue`, and a completely replayed recovery
  queue produces one `queue saved`. TreeBrowser gives every multi-select action
  one persisted user-command ID, so its individual mutations share one visual
  lifecycle. Internal selection persistence does not create write messages.
- DataBrowser now also issues create, rename, move, reparent, delete, enabled,
  selection, and content commands exclusively through `WorkspaceSyncEngine`.
  Its local TreeBrowser model receives the same optimistic replica result that
  will later be replayed; there is no longer a direct-write exception between
  Inventory and the general DATA editor.
- MEMO, DATA, and FUNC `InputControl` instances are controlled and persist
  node-scoped drafts through that store. DATA content starts with an editable ID
  input; Inventory exposes the same field as its first form row. IDs use
  lowercase letters, numbers, `_`, and `-`, are unique only among siblings, and
  are generated from the item name with collision suffixes. Set Parent and app
  data-source inputs resolve paths composed from these IDs instead of labels;
  UUIDs remain the persisted relationship keys. `InputControl` retains an uncontrolled
  mode only for isolated examples. DATA and Inventory compose one catalogued
  `NodeIdInput → InputControl` specialization for the ID field. It owns ID
  normalization and validation while inheriting the complete configured
  InputControl, Input, Button, and Keyboard property chain; neither feature
  recreates or replaces that visual contract.
- App DataSource drafts are free tree paths rather than Set-Parent targets.
  ConfigEditor validates every changed draft synchronously against the
  in-memory replica tree; there is no debounce or validation request. The input
  becomes green and Set Datasource becomes enabled only for a valid, non-empty
  path different from the saved path. Inventory
  now applies valid empty branches as an
  empty inventory and clears its previous root/items instead of retaining the
  earlier source or fixture.
- Tree view state owns `contentVisible`; children and content are independent,
  so every item can switch between both views. `TreeBrowser` controls only
  navigation, mode switching, and content height; a generic
  `renderContent` contract supplies the actual content. `AgentModule` and
  `DataBrowser` compose `InputControl`. `FunctionBrowser` owns discriminated
  system/user-function descriptors: active `DeviceInfo` is output-only, while
  future user functions compose `InputControl`.
- `TreeBrowserModel` separates the revisioned tree document, semantic enabled
  state, and view state (content mode, selection, pages, and page sizes).
  Runtime `data` attachments are stripped before persistence and reattached
  from current definitions by stable node ID. Persisted `kind` retains the type
  of user-created nodes. Invalid stored selection paths are truncated at the
  first missing child; no tree state is sent to a server yet.
- Tree nodes independently own `listEditable`, `contentEditable`, and an
  optional `listItemLimit`; equivalent root-list props cover the invisible
  root. Locked lists disable their mutating controls, limits block additional
  children, and the mode button is disabled when its target mode is locked.
  FUNC fixes its three-entry root plus the `Widgets` and `System` child lists.
- List editability does not disable checkboxes: checkboxes extend the local
  action selection even in locked lists. The older semantic enabled state
  remains in `TreeBrowserModel` snapshots for compatibility, but is no longer
  controlled by the TreeBrowser row checkbox.
  Stable sibling keys ensure inserting or removing an output view never
  remounts the state-owning FunctionBrowser.
  The Compass data attachment is tagged as a `view-generator`; its output is
  produced only when `Widgets`, `Compass`, the category, and the saying are all
  locally enabled. DeviceInfo likewise requires both `System` and `DeviceInfo`.
- `shopping-list.json` is a second server-response prototype attached at
  `Widgets → ShoppingList`. It is projected into supermarket categories and
  article leaves, tagged as a separate view generator, and evaluated through
  the complete `Widgets → ShoppingList → category → article` visibility path.
  Active results render in `ShoppingListView → FunctionView → Base`.
  CompassView and ShoppingListView appear as soon as their view root and
  `Widgets` are enabled, even with no enabled category or leaf; deeper flags
  determine content only and an empty result no longer removes the view.
- `FunctionView` is the shared base for both `CompassView` and
  `DeviceInfoView`. It owns their fixed minimum/maximum height, stationary
  accent title, and independently scrolling content area; the derived views
  provide `COMPASS` and `DEVICEINFO` respectively.
- `DeleteButton` is a self-contained timeout control. Its first click arms only
  the button in `COLOR_ERROR`; a second click within `UNLOCK_BUTTON_TIMEOUT`
  deletes, otherwise it disarms automatically without manipulating its owner.
- Interactive style composition now uses explicit derived chains:
  `Button → PressButton → CycleButton → ListControlListSizeButton`,
  `Button → BrowserItemLabelButton`, `Button → DeleteButton`,
  `Button → DialerButton → DialerCenterButton`, and
  `Button → DeviceInfoButton`. Parent Base properties are resolved first and
  complete child Base properties override them. List-control action layout no
  longer hardcodes child widths, and application-native raw label buttons have
  been removed.
- `DeviceInfo` remains catalogued independently and is composed by the FUNC
  output when its visibility flag is active.
- `DEVICEINFO` reports only passive browser-exposed client information in a
  read-only result field and requests no permissions.
- V1 sources remain archived in `../frontend` and `../backend`, but the combined
  production deployment disables their service and no longer routes traffic to
  them. They are not part of the active verification or deployment path.

## Backend V2 foundation

- `../backend-v2` is an independent workspace and does not serve or modify V1
  data.
- `@flydeck/shared/v2` owns strict, narrow network contracts for errors,
  sessions, workspace summaries, initial flat tree loads, and separate create,
  rename, move, delete, enable, selection, and content mutations. There is no
  GraphQL or universal tree-command payload.
- Backend V2 uses Express 5, Zod, and `pg`. The checked-in PostgreSQL migration
  creates users, credentials, hashed opaque sessions, workspaces, memberships,
  trees, nodes, content, per-user semantic/selection state, idempotency keys,
  and audit events.
- `/flydeck/api/v2/health/live` is process-only;
  `/flydeck/api/v2/health/ready` checks PostgreSQL.
- Production deploys the V2 frontend at the Flydon hostname root (`/`), while
  the stable API remains under `/flydeck/api/v2`. The root `deploy.sh` tests,
  builds, and deploys Flydeck V2 plus Relay One, disables the V1
  `flydeck.service`, replaces the old Flydon Serve routes with the V2 root, and
  refreshes Relay One through its isolated Funnel identity.
- Every response receives a request ID. Errors use the shared stable envelope.
- `/auth/session` resolves an opaque cookie by its SHA-256 hash and returns only
  the user's workspace memberships. `LOGIN_REQUIRED=false` instead resolves a
  configured local identity for personal/family installations. Password login
  uses salted Scrypt credentials plus opaque HttpOnly sessions; logout revokes
  the stored token hash.
- PostgreSQL migration integration tests require an explicitly supplied
  disposable `FLYDECK_V2_TEST_DATABASE_URL`; they are skipped when no test
  server is available rather than substituting SQLite.

## Development lab

- `src/config/componentManifest.ts` is now the authoritative inventory and
  single-parent inheritance graph for all 75 production component TSX files.
  The application catalog, composition depth colors, and component-family
  lists derive from that manifest. Architecture tests compare the manifest to
  the complete `components` and `modules` source tree, reject missing parents
  and cycles, and require every component to terminate at `Base`.
- The catalog now includes isolated previews for `AppView`, `CompassApp`,
  `ConfigEditor`, `ContentEditor`, `DataSourceInput`, `DataTree`,
  `BackupApp`, `DeviceInfoView`, `DialSurface`, `Dialer`, `InlineAppView`,
  `InventoryApp`, `PressButton`,
  `ParentInput`, `RootInputControl`, and `ShoppingListView`. Every selected application
  component displays its manifest-derived complete inheritance chain.
- Composition depth is no longer capped at two; depths three and four expose
  the actual `PressButton` and side-module chains. `ConfigEditor` now composes
  `Base` and exposes `BaseStyleProps` instead of using a raw root `div`.
- `PressButton` is a persisted intermediate component contract. `ModuleButton`,
  `SubmoduleButton`, `CycleButton`, and
  `ListControlListSizeButton` resolve their Base properties through it.
  `AppStatusLine` is a noninteractive `Base` output and cannot open or focus a
  status dialog.
  `ListControlListSizeButton` now derives from and renders `CycleButton`, owns
  its `BUTTON_WIDTH`, and no longer advertises the unrelated
  `ListControlButton` contract. `DeleteButton` has one stable `Button` parent
  for both icon and text content instead of changing its runtime ancestry.
- The primary AGNT, DATA, DATB/DATC/DATD, and APPS controls retain their text labels
  but hide their decorative symbols at viewport widths up to 620px.
- The manifest test loads every component source and verifies that its JSX
  renders the exact direct parent declared by its public component contract.
  `Keyboard` no longer reaches into descendant buttons with a CSS selector or
  privately overrides their persisted height and padding.
- `AppView` and its `CompassApp`, `DeviceInfoView`, `InventoryApp`, and
  `ShoppingListView` specializations now have persisted Base contracts that
  resolve through the declared `AppView` parent. `ConfigEditor` has its own
  persisted Base contract. `AppView` also owns the semantic `read` versus
  `read-write` contract: read-only app titles use the green secondary accent,
  while writers use the blue active accent. Their nested Button, Input, Textarea,
  DataSourceInput, CycleButton, and DeviceInfo dependencies receive explicit
  component props from `App`; the views no longer hide visual defaults or
  reach around the component-property chain.
- The tree/input graph now persists and resolves every declared specialization:
  `DataTree → DataBrowser → TreeBrowser`, `MemoryBrowser → TreeBrowser`,
  `ContentEditor/NodeIdInput → InputControl`, and
  `ParentInput/DataSourceInput → RootInputControl → Base`. `DataTree` retains its own
  component identity through the complete runtime chain. App and the lab pass
  the derived Base values and nested control props explicitly; editable Base
  and font values are no longer duplicated as TSX defaults in TreeBrowser,
  BrowserItem, ListControl, Input, Textarea, Keyboard, InputControl, or
  RootInputControl. DATA and Inventory now share `ParentInput` for validated
  parent paths and the `Set Parent` action. An architecture test protects this
  boundary.
- The final component audit covers all 72 manifest entries. Every component
  except the foundational `Base` now owns a persisted Base contract.
  `DialSurface → Base`, `Dialer → Base`, and `ColorDialer → Dialer` are
  represented in generated properties,
  runtime resolution, and the lab; Dialer receives its DialSurface properties
  through an explicit child contract. No derived component keeps editable
  color, background, border, spacing, dimensions, or typography as a TSX
  parameter default. Manifest and property tests enforce both invariants.
- `Block → Base` is the explicit app-row layout primitive and always occupies
  the complete app width. `Form` composes `Base<form>`. `FormRow` composes
  `Block` plus the shared `Button`; it renders no idle action, so its field uses
  the complete row width. Focusing a row adds `Save` below the keyboard; a row
  with an `onNew` contract also adds `New`. `ParentInput` likewise renders
  `Set Parent` only while its field is being edited.
  The previous input-aid component has been fully renamed to `Keyboard`.
  `InputControl` is now the common keyboard-backed wrapper for an `Input` or a
  `Textarea`. In the APPS TreeBrowser it keeps Keyboard visible for the complete
  input focus, spans Keyboard across the complete selected-item input, and places
  `NEW`/`SAVE` or `SEND` in Keyboard's own action row below the tool keys.
  Keyboard initially suppresses the native mobile keyboard through
  `inputMode="none"`; its smartphone-keyboard button only releases and focuses
  the native device keyboard and never toggles the Flydeck Keyboard. The
  31 stable logical placeholder keys are owned directly by `Keyboard` and are
  always visible with it; key 30 is the space key and renders as three equal
  button segments. Keyboard rows, toolbar buttons, and action buttons have no
  inter-button gap. They are not toggled by the native smartphone-keyboard
  button. Keys 1–19 and 21–27 now enter the 26-character QWERTZ sequence;
  short Shift presses cycle lowercase, uppercase, and the complete requested
  symbol layout, while an unlocked alternate layout returns to lowercase after
  one character. `ShiftButton → LongPressButton → Button` owns key 20 and a
  long press locks uppercase or the currently selected symbol layout until the
  next Shift press; its uppercase state uses the distinct `ArrowBigUpDash`
  symbol only after the already-active Shift button is pressed again for the
  symbol layout. Key 28 performs exactly one Backspace action per press. Key 29
  is the parent emoji-mode Shift control: it replaces all 26 character keys
  with emoji while leaving comma, space, and period unchanged; key 20 then
  cycles through two additional emoji layouts. Key 29 uses the first smiling
  emoji (`😀`) as its visible label; in emoji mode key 20 displays the first
  emoji of whichever emoji layout is currently active. The three segments of key 30
  insert comma, space, and period respectively;
  all Keyboard button symbols are optically lowered by three pixels. Inventory form
  rows still use their existing action placement until the announced Form and
  FormRow migration.
  InventoryApp uses rows for Name,
  Desc, and Parent. Name and description are local drafts and change the item
  only through Save; the focused Name row can create a sibling item from the
  drafts. Parent remains the sole branch-reparenting control. Both components
  are independently catalogued and editable. Inventory is a `read-write` app:
  Name, Desc, Parent, and New persist through the V2 tree APIs and carry the
  server's node, content, and tree revisions forward; failed mutations reload
  authoritative server state.
- `Breadcrumb` renders the complete clickable Inventory parent chain and
  `ItemList` renders the current sibling level with its selected item. Both
  compose the shared `CompactButton → Button → Base` specialization. Its
  smaller typography, height, and padding are persisted properties; the two
  containers own a zero-gap wrapping layout. Inventory derives `hasChildren`
  for every item in both horizontal lists through one status function;
  `CompactButton` renders branch items with a thicker border and leaf items
  with the configured standard border. An empty parent chain remains visible
  as a disabled `root` CompactButton with a dashed border. Inventory no longer
  renders the previous green path/status string.
- `AppShell` composes a reusable `BackgroundLogo` behind its transparent
  module/browser layers. Its Unicode symbol, responsive font-size factor,
  opacity, and Base properties are independently editable in the alphabetic
  component lab.

- `/lab` is development-only and uses separate application, scaffold, and
  theme catalogs.
- Only one selected catalog entry is displayed at a time.
- The last selected application component is restored from browser-local
  storage when the lab is opened again.
- Application component properties are edited in a monospaced textarea with a
  component section and an inherited `Base` section.
- `Module` and all six concrete modules are registered as application
  components in the lab.
- `DeviceInfo` is independently registered in the application-component
  catalog; its collection, refresh, and result UI no longer live in
  `FunctionsModule`.
- The selected theme supplies the CSS variables for the complete lab, including
  catalog controls and isolated previews.
- App, scaffold, and theme catalogs are alphabetically sorted. App-component
  buttons use progressively lighter greys for `Base`, direct `Base`
  compositions, and `Module` compositions.
- Each theme instantiates both `ColorMapEditor` and `TokenEditor`. Theme data
  owns its colors and its app dimensions, shared spaces, standard control
  height, control radius, and standard-border value. Applying a theme derives
  both generated CSS files from that selected theme.
- `ColorMapEditor` and `TokenEditor` also remain independently registered
  scaffold components with isolated catalog views.
- Lab catalogs, theme selectors, and actions compose `Button`; the APP
  navigation composes `ButtonLink`.
- Shared `Base` style props accept `inherit`, uppercase CSS-variable names
  (resolved to lowercase custom properties), or individual CSS values.
- The former global `CONTROL_HEIGHT_STANDARD` token has been removed.
  Component and child-control properties now determine control heights; the
  browser, list control, title, and empty tree slots no longer impose a hidden
  44px minimum height.
- Generated design tokens include `BUTTON_WIDTH` (`--button-width`, initially
  `44px`). The token editor uses the same CSS-like notation as component
  properties: numeric values include their units and string values have no
  JSON quotation marks.
- `Base.showComponentName` globally enables the component inspector.
  Component roots show a translucent-pink name label at their top-left.
  Clicking only that label area opens a floating list of its named component
  ancestors; each name stores the lab selection and navigates directly to
  `/lab`. Ordinary component clicks remain untouched. Clicking outside the
  menu or pressing Escape closes the inspector. Native buttons and links in
  the lab chrome are excluded from interception so catalog and editor actions
  always retain their primary navigation behavior.
- The Base contract uses `color` rather than an abstract foreground name and
  includes `width` and `height`, which default to `unset`.
- AppShell centering, app background, and inset are explicit generated
  properties; its configured inset remains safe-area aware.
- `AppTitle` exposes independent font sizes and layout-preserving top/left
  visual corrections for its symbol and subtitle through generated properties
  and the lab props text.
- Textarea edits update the preview. `APPLY` validates and persists them for
  the application.
- Opening the custom `Keyboard` preserves the focused `Input`, `Textarea`, or
  `InputControl` height and expands its surrounding app content by the
  keyboard height. `DataBrowser` content and fixed-height `AppView` surfaces
  release their height caps while a keyboard is visible, so the keyboard does
  not compress the text-entry area.
- Text content and the DATA ID field use a `Save` action. DATA parent editing places `Set Parent`
  below the keyboard; Inventory places `Save`/`New` for Name and `Save` for
  Desc below the keyboard and uses the same shared `ParentInput` action row.
  RootInputControl prevents its action button's pointer-down from blurring the
  input, so mobile browsers cannot remove or move the button before its click.
- `Keyboard` has one target-independent toolbar contract: its time/date button
  is always present for both `Input` and `Textarea`; no caller-specific flag
  controls that toolbar composition. A far-right X button in `COLOR_SPEECH`
  closes every Keyboard and blurs its target so it can be opened again normally.
- Keyboard row two widens its `A` and `L` edge keys to the full keyboard
  bounds. Backspace composes the dedicated `BackspaceButton → PressButton`
  contract: it deletes once on press and repeats after a short hold delay until
  release or cancellation.
- The Keyboard toolbar's smartphone-keyboard button is a selected-state toggle:
  its first press enables and opens the native keyboard, while its next press
  restores `inputMode=none` and closes it without closing the Flydeck keyboard.
- Every Input, Textarea, and InputControl Keyboard starts its font-size selector
  at the shared `M` stage; users can still cycle through `L` and `S`.
- `Input` owns a noninteractive half-transparent label at its right edge;
  `Textarea` owns the equivalent label at its top-right corner. Both labels use
  the field's current scaled font size and disappear when the field content is
  longer than ten characters. Inventory uses the embedded labels
  `ID`, `Name`, `Desc`, and `Parent` instead of idle side buttons.
- `Keyboard.buttonHeight` is the single persisted height for every toolbar and
  character button owned by Keyboard. The Keyboard lab edits only this local
  layout property and its Base contract; BackspaceButton, CycleButton,
  DialButton, LongPressButton, and ShiftButton remain independently configured
  in their own lab entries and are still passed explicitly for composition.
- `LongPressButton` uses Button's controlled pressed appearance to drop back
  to its inactive colors as soon as the second/hold action fires. The short
  action remains suppressed until release, and selected semantics remain
  exposed through `aria-pressed` while the visual confirmation is inactive.
- `CycleButton` remains the controlled selector used by both `S M L` controls:
  Keyboard font size and ConfigEditor app height. In the symbol layout, the
  former `X`/`$` key instead composes `DialButton → PressButton`: its static
  label starts with `€` and a small `$`; the first press inserts `€`, rapid
  subsequent presses replace that same character with `$`, then `€`, while a
  press after the shared 500ms dial timeout starts a new character. Every
  DialButton keeps its active color for that complete timeout; another press
  restarts both the dial window and its visible active state.
- The comma key is a DialButton with `, " '` and the period key is a DialButton
  with `. - :`. In the symbol layout, the bracket keys are DialButtons with
  `( <` and `) >`. Symbol position 23 is `%`; positions 24–26 are DialButtons
  for `/ \\ |`, `{ } [ ]`, and `^ ~ \``. Repeated presses within the shared
  timeout replace the last character instead of inserting consecutive values.
- Letter keys `a`, `o`, and `u` are DialButtons with `ä`, `ö`, and `ü` as their
  second values. `l` is a DialButton with `!` and `?` as its alternatives;
  those two characters no longer occur on the symbol layout. One-shot uppercase
  remains active for the complete 500ms dial
  window so the second press can produce `Ä`, `Ö`, or `Ü`, then returns to
  lowercase when the timer completes. Key 31 is Enter and inserts a newline.
- Uppercase remains a one-shot Shift state, while the second Shift state
  (symbols) remains active after character input and Currency-cycle presses
  until Shift is pressed again.
- The properties textarea uses a larger monospaced font for comfortable
  editing. The lab has no clipboard/JSX generation action.
- `CommentHighlightedTextarea` provides the shared passive grey background for
  comment lines in both component properties and generated design tokens.
- Lab scaffold includes `ColorMapEditor`, `RgbColorField`, and the required
  desktop-only `NumberInput` with custom hold-repeat step buttons.
- Themes currently are `Flydeck` and `Greyscale`.

## Generated sources of truth

- `src/config/generated-component-properties.json`
- `src/styles/generated-tokens.css`
- `src/styles/generated-colors.css`
- `src/themes/generated-themes.json`

The application reads these generated files. Lab apply endpoints must validate
the complete payload before writing and are unavailable in production.

## Verification

From the repository root:

```sh
npm run build --workspace flydeck-frontend-v2
npm run lint --workspace flydeck-frontend-v2
npm test --workspace flydeck-frontend-v2
npm test --workspace flydeck-backend-v2
npm test --workspace flydeck-relayone
./deploy.sh # only when production deployment is explicitly intended
git diff --check
```

Restart the V2 development server after changes to `vite.config.ts`; an already
running process does not acquire new development endpoints automatically.

## Continuation point

`TreeBrowser` is visible under `AGNT` → `MEMO` with plant dummy data;
`DataBrowser` is visible under `DATA`. `TreeBrowser`, `MemoryBrowser`,
`BrowserItem`, `Checkbox`, `Input`, and `ListControl` are independently
catalogued in the lab. Client consolidation Phase 1 is complete. Phase 2 has
the shared REST contracts, backend workspace, first migration, health/error
boundary, and read-only session/workspace boundary in place. The next step is
running the migration against a disposable PostgreSQL test database, then
implementing authenticated bootstrap and workspace-authorized tree reads.
