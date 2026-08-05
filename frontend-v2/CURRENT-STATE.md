# Flydeck Frontend V2 — Current State

This is the short-lived handoff document for a fresh agent context. Durable
rules belong in `AGENTS.md`; architecture and migration intent belong in
`rebuild-plan.md`.

## Implemented application surface

- `BlockingDialog` is the reusable modal interaction boundary.
  `SynchronizationDialog` explains which server operation is still pending and
  why, and permits an explicit continuation with the last confirmed server
  state. `LoginDialog` is non-dismissible and performs password login. All
  three are independently catalogued. While a dialog blocks, `AppShell` is
  inert and hidden from the accessibility tree.
- Application startup reads `/auth/session`. A response taking longer than
  three seconds opens `SynchronizationDialog`; continuing does not promote any
  unconfirmed client mutation to authoritative state. `LOGIN_REQUIRED=false`
  enters through the configured local server identity; required login opens
  `LoginDialog`.
- `DeleteButton` now acquires an immediate in-flight guard before invoking an
  asynchronous delete. It remains disabled until that promise settles. This
  local destructive-action lock is independent from dismissing a global
  synchronization dialog.

- `App` composes `AppShell`, `AppTitle`, `ModulePanel`, and the active module.
- `Button` is the shared selected/disabled button control. `ModulePanel` and the
  AppShell viewport simulation compose it instead of styling raw buttons.
- `ModuleButton` composes `Button` and keeps the standard 44px control height.
  `AgentModuleButton`, `DataModuleButton`, `FuncModuleButton`, and
  `CronModuleButton` each compose it, own their label, and require their
  persisted editable character prop without an icon-library dependency.
- The module-button lab editors display the composition chain explicitly:
  concrete button → `ModuleButton.symbol` → `Button.activeColor` → `Base`.
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
- `CronModule` is an interaction prototype that composes the shared `Dialer`
  through `CronDialer` and `ColorDialer`; it does not yet own timer creation or
  a timer list. `SettingsModule` remains an empty migration target. `AgentModule`
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
  the previous `flydeck.tree.*` keys. No other production source accesses
  `localStorage` directly.
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
