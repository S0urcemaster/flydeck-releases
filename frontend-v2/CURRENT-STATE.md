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
  In its normal state it renders the `WifiOff` symbol. While enabled it replaces
  that symbol with the global number of pending Outbox transactions, blocks
  every V2 API request before transport, and therefore exercises the real
  cache/optimistic/outbox path. Disabling it releases transport and immediately
  retries every registered workspace scope.
- `DeleteButton` now acquires an immediate in-flight guard before invoking an
  asynchronous delete. It remains disabled until that promise settles. This
  local destructive-action lock is independent from global synchronization
  status.

- `App` composes `AppShell`, `AppTitle`, `ModulePanel`, and the active module.
- `Button` is the shared selected/disabled button control. `ModulePanel` and the
  AppShell viewport simulation compose it instead of styling raw buttons.
- `ModuleButton` composes `PressButton` and is parameterized by label and
  symbol. `ModulePanel` renders AGNT, DATA, APPS, and CRON directly as four
  instances of that one component; the former empty wrapper components and
  their duplicate persisted contracts have been removed.
- The ModuleButton lab editor displays its composition chain explicitly:
  `ModuleButton.symbol` → `PressButton` → `Button.activeColor` → `Base`.
- `Button.activeColor` owns its selected-state accent. Module buttons use the
  blue `ACCENT_ONE`; green `ACCENT_TWO` is reserved for a subordinate control
  level rather than alternating within the module level.
- `SubmodulePanel` owns controlled subordinate navigation and composes
  `SubmoduleButton` for `CHAT` and `MEMO`. `SubmoduleButton` derives the full
  persisted `Button.base` contract, including its configured 40px height, and
  uses green `ACCENT_TWO` for selection. Both are independently catalogued.
- `Textarea` is the shared multiline control used by `FunctionsModule` and the
  lab property editor.
- The shared module-menu state keeps `AGNT`, `DATA`, `FUNC`, `CRON`, `HELP`,
  and `CONFIG` mutually exclusive. The active module, previous primary module,
  and AGNT submodule are persisted through the unified client state store.
- `ModuleMenuActions` renders the symbol-only `HelpModuleButton` and
  `ConfigModuleButton` in the `AppTitle` action slot while sharing the same
  controlled menu state as `ModulePanel`.
- `HelpModuleButton` and `ConfigModuleButton` derive from the shared
  `SideModuleButton`, which derives from `ModuleButton` and owns the
  `BUTTON_WIDTH` override. The concrete side buttons inherit that width.
- `Module` is the shared base surface for `AgentModule`, `DataModule`,
  `FunctionsModule`, `CronModule`, `HelpModule`, and `SettingsModule`.
- Concrete module properties resolve `inherit` against the configured
  `Module.base`, so border, background, spacing, and color form one shared
  module body unless a concrete module overrides them.
- `CronModule` composes the shared `Dialer` through `CronDialer`. The current
  interaction prototype gives the fixed inner ring a continuous logarithmic
  `1h`–`5y` zoom scale with a five-degree north dead zone. The outer ring uses
  a dynamically rebuilt time scale with roughly twelve suitable marks
  (five-minute marks at the `1h` zoom) around the independently positioned
  outer value pointer; zooming does not change the selected time. Labels fade
  only at north, never at the value pointer. Selecting a time stores the outer
  pointer angle and current range as its zoom anchor. Zooming out moves the
  pointer toward north; zooming back in returns it to that stored angle. Any
  further zoom toward the `1h` maximum keeps the pointer fixed and expands the
  scale around it. Time values and marks follow the remembered clockwise or
  counterclockwise side, keeping zero at north on either half. Both duration
  and target date use the center format `yyy.mm.dd hh:mm`. Its
  scale, pointer, font-size, and separate ring-background properties remain in
  the typed lab contract. The four corner labels and center duration/date-time
  conversion remain; the module does not yet own
  timer creation or a timer list. `SettingsModule` remains an empty migration
  target. `AgentModule`
  owns subordinate `CHAT` and `MEMO` navigation; `MEMO` presents the recursive
  `TreeBrowser` with a locally persisted plant fixture.
  `HelpModule` renders `src/assets/manual.md`.
  `HelpModule` and `SettingsModule` are connected to the HELP and CONFIG title
  actions respectively.
- `MemoryBrowser` is a typed `TreeBrowser` specialization and remains
  disconnected from `AgentModule` until the plant fixture is replaced. The
  overlapping `EntryBrowser` implementation and catalog entry have been
  removed.
- `TreeBrowser` is the recursive tree-navigation base currently shown directly
  under `AGNT` → `MEMO` with a plant-inheritance fixture. The root is invisible.
  Each visible level owns a list control and a fixed five-row list. Selecting one
  row appends exactly one child level below the complete current list; leaf
  selection appends the same five-row level as an empty list. There is no tree
  indentation and no child list is inserted beside or immediately after its
  parent row.
- `BrowserItem`, `Checkbox`, and `ListControl` own the reusable row, enable
  control, and paging UI respectively. All are independently catalogued and
  have persisted Base properties.
- `BrowserItem` shows its `DeleteButton` only while selected and no longer owns
  ordering controls. `ListControl` places its page status at the left, a
  reusable `Input` in the remaining row width, and `＋` plus previous-page,
  move-up, move-down, and next-page buttons at the right. NEW is enabled only
  for a non-empty name that does not already exist case-insensitively.
  `ListControlListSizeButton` is controlled by the list owner, displays current
  page/total pages, and requests list-size changes through `3 → 5 → 10 → 3`;
  each tree level owns the resulting setting independently.
  `TreeBrowser` supplies the selected-row color by depth, alternating from
  `ACCENT_ONE` to `ACCENT_TWO`.
  ListControl page and page-size changes never alter `selectedPath`; an active
  item and its descendant list/content remain active even while another page
  of the owning list is visible.
- `DataBrowser` and `FunctionBrowser` specialize `TreeBrowser` and are shown
  in DATA and FUNC. `DataBrowser` owns broad dummy data categories.
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
- Canonical DATA is being separated from that UI/preference store. The first
  `WorkspaceReplicaStorage` contract defines user/workspace isolation,
  revisioned tree/content records, a typed mutation outbox, sync status, and
  atomic transactions. Its tested memory adapter is the deterministic test
  boundary; the production IndexedDB adapter stores each replica in a single
  read/write transaction. DataBrowser now hydrates its tree and node content
  cache-first from that replica and refreshes each from confirmed server data.
  Inventory uses the same cached tree/content projection, refreshes it from the
  server, and writes confirmed create, rename, reparent, and content results
  back through the replica. A local cache failure is reported globally without
  turning an already confirmed server mutation into a failed mutation.
  Offline mutation queuing remains the next step.
- Every shared DATA mutation contract now carries a UUID request ID, including
  create, rename, move, reparent, delete, enabled state, selection, and content.
  Create additionally carries its client-assigned node UUID so an offline item
  has one stable identity before server contact. Backend tree routes execute
  each non-create command through a transaction-scoped idempotency boundary;
  mutation and recorded response commit atomically, repeated IDs replay the
  original response, and cross-operation ID reuse is rejected. Create retains
  its existing stored-response path and now serializes concurrent repeats with
  the same advisory lock. `WorkspaceReplica` can durably enqueue, deduplicate,
  count attempts, and acknowledge typed commands.
- `WorkspaceSyncEngine` now owns serialized per-workspace replay, dispatches
  every typed DATA command through `V2ApiClient`, retains failed entries,
  records attempts, acknowledges confirmed responses, and refreshes the tree
  after a drained queue. App startup registers the last confirmed workspace;
  browser `online` events retry every registered scope. Inventory is the first
  complete optimistic writer: New, Name, Desc, and Parent update DATA plus
  outbox in one IndexedDB transaction, immediately re-project from the replica,
  and use the same path whether online or offline.
- `WorkspaceSyncEngine.submit` returns the durable optimistic replica record
  immediately after that single local transaction. Server dispatch, outbox
  acknowledgement, and the final confirmed-tree refresh continue in the
  background, so DATA selection and editing no longer wait for network replay.
  DataBrowser consumes that returned record directly instead of re-reading the
  replica and replacing/remounting its complete tree after every action.
- DataBrowser now also issues create, rename, move, reparent, delete, enabled,
  selection, and content commands exclusively through `WorkspaceSyncEngine`.
  Its local TreeBrowser model receives the same optimistic replica result that
  will later be replayed; there is no longer a direct-write exception between
  Inventory and the general DATA editor.
- MEMO, DATA, and FUNC `InputControl` instances are controlled and persist
  node-scoped drafts through that store. `InputControl` retains an uncontrolled
  mode only for isolated examples.
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
- List editability does not disable checkboxes: each node's checkbox is an
  independent visibility flag and all FUNC flags start off. `FunctionBrowser`
  reports its derived output state to `FunctionsModule`, which renders the
  bounded `DeviceInfoView` and `CompassView` above the less frequently used
  browser. Both compose `FunctionView → Base`. DeviceInfo appears when its item
  is enabled; Compass shows enabled sayings grouped under enabled categories
  when Compass itself is enabled. Enabling a parent never mutates its children.
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
  `Button → ListControlButton → ListControlListSizeButton`,
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
- V1 in `../frontend` remains the operational reference and must keep building.

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
  single-parent inheritance graph for all 72 production component TSX files.
  The application catalog, composition depth colors, and component-family
  lists derive from that manifest. Architecture tests compare the manifest to
  the complete `components` and `modules` source tree, reject missing parents
  and cycles, and require every component to terminate at `Base`.
- The catalog now includes isolated previews for `AppView`, `CompassApp`,
  `ConfigEditor`, `ContentEditor`, `DataSourceInput`, `DataTree`,
  `DeviceInfoView`, `DialSurface`, `Dialer`, `InventoryApp`, `PressButton`,
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
  `ListControlListSizeButton` now derives from and renders `PressButton`, owns
  its `BUTTON_WIDTH`, and no longer advertises the unrelated
  `ListControlButton` contract. `DeleteButton` has one stable `Button` parent
  for both icon and text content instead of changing its runtime ancestry.
- The primary AGNT, DATA, APPS, and CRON ModuleButtons retain their text labels
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
  `ContentEditor → InputControl`, and
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
  `DialSurface → Base`, `Dialer → Base`, and both
  `ColorDialer/CronDialer → Dialer` are represented in generated properties,
  runtime resolution, and the lab; Dialer receives its DialSurface properties
  through an explicit child contract. No derived component keeps editable
  color, background, border, spacing, dimensions, or typography as a TSX
  parameter default. Manifest and property tests enforce both invariants.
- `Block → Base` is the explicit app-row layout primitive and always occupies
  the complete app width. `Form` composes `Base<form>` and supplies one
  persisted `actionWidth` to all nested `FormRow` actions. `FormRow` composes
  `Block` plus the shared `Button`;
  its idle right-hand button shows only the value label. Focusing a row changes
  that action to `Save`; a row with an `onNew` contract adds `New` below it.
  The previous input-aid component has been fully renamed to `Keyboard`.
  `InputControl` is now the common keyboard-backed wrapper for an `Input` or a
  `Textarea`. In the APPS TreeBrowser it keeps Keyboard visible for the complete
  input focus, spans Keyboard across the complete `ListControl`, and places
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
- Text content uses a `Save` action. DATA parent editing places `Set Parent`
  below the keyboard; Inventory places `Save`/`New` for Name and `Save` for
  Desc below the keyboard and uses the same shared `ParentInput` action row.
- `Keyboard` has one target-independent toolbar contract: its time/date button
  is always present for both `Input` and `Textarea`; no caller-specific flag
  controls that toolbar composition.
- Keyboard row two widens its `A` and `L` edge keys to the full keyboard
  bounds. Backspace composes the dedicated `BackspaceButton → PressButton`
  contract: it deletes once on press and repeats after a short hold delay until
  release or cancellation.
- `LongPressButton` uses Button's controlled pressed appearance to drop back
  to its inactive colors as soon as the second/hold action fires. The short
  action remains suppressed until release, and selected semantics remain
  exposed through `aria-pressed` while the visual confirmation is inactive.
- `CycleButton` remains the controlled selector used by both `S M L` controls:
  Keyboard font size and ConfigEditor app height. In the symbol layout, the
  former `X`/`$` key instead composes `DialButton → PressButton`: its static
  label starts with `€` and a small `$`; the first press inserts `€`, rapid
  subsequent presses replace that same character with `$`, then `€`, while a
  press after the 800ms dial timeout starts a new character.
- The comma key is a DialButton with `, " '` and the period key is a DialButton
  with `. : ;`. In the symbol layout, the bracket keys are DialButtons with
  `( <` and `) >`. The now-duplicate quote/colon/semicolon symbol positions are
  non-writing placeholders labeled with their key numbers `23`–`26` pending a
  final assignment.
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
npm run build --workspace flydeck-frontend
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
