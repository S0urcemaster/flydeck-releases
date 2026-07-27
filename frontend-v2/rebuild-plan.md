# Flydeck Frontend V2 — Initial Rebuild Plan

## Objective

Rebuild the Flydeck frontend as a composable Lego system while keeping the existing frontend fully operational as the visual and behavioral reference.

The backend and shared package remain in place. Frontend V2 is developed in parallel and must not require destructive changes to the existing frontend.

## Repository strategy

During the rebuild:

```text
flydeck/
├── frontend/          # current production-capable reference
├── frontend-v2/       # new atomic implementation
├── backend/
├── shared/
└── reference/         # screenshots and UI inventory when added
```

After V2 reaches feature and visual parity, the current frontend may move to a clearly marked legacy location and V2 may become the primary frontend.

Before that switch:

1. Commit and tag the final V1 state.
2. Capture screenshots of all tabs and important states.
3. Maintain a UI inventory.
4. Keep both frontends independently buildable.
5. Compare each migrated screen against the running V1 reference.

## Component model

An atomic unit owns:

- markup;
- local styling;
- visual variants;
- interaction behavior;
- accessibility contract;
- tests;
- a small public API.

Atomic means a self-contained component directory, not necessarily a single source file.

```text
ComponentName/
├── ComponentName.tsx
├── ComponentName.module.css
├── ComponentName.test.tsx
└── index.ts
```

CSS Modules are the default styling mechanism. Global CSS is restricted to reset/base rules and design tokens.

## Lego hierarchy

```text
tokens
└── color, spacing, typography, height, and motion contracts

primitives
└── Button, TextInput, Textarea, Stack, Grid, Surface

controls
└── SafetyButton, DeleteModeButton, Pager, CursorButton

components
└── AppTitle, Editor, Dialer, EditableList, TimerList

features
└── Chat, Data, Cron, Settings, Help

app
└── composition, routing, and top-level state
```

Screens compose smaller units. They must not reach into component internals with CSS selectors.

## Architecture rules

- No feature may style another component's descendants.
- No raw design colors outside token definitions.
- No duplicated button, input, list-row, or surface implementations.
- Variants are explicit props such as `size`, `tone`, `selected`, and `disabled`.
- Standard and compact dimensions come from tokens.
- State has one clear owner.
- Reusable interaction behavior belongs to a control or hook.
- Do not abstract a component before a stable contract exists.
- Prefer composition over configuration-heavy mega-components.
- Preserve keyboard, pointer, touch, and screen-reader behavior.
- Every completed slice must build independently.

## Migration order

1. App shell, tokens, and `AppTitle`.
2. Button and surface primitives.
3. TextInput and Textarea.
4. Stack, grid, rows, and pager.
5. Lists and centralized delete mode.
6. Editor controls.
7. Phone keyboard.
8. Character dial.
9. DATA as the first complete feature.
10. CRON.
11. CHAT and SNIP.
12. SETTINGS and HELP.
13. Visual comparison, accessibility checks, and production cutover.

## First vertical slice

The initial slice contains no feature content:

- a responsive `AppShell`;
- global design tokens and base rules;
- an atomic `AppTitle`;
- an intentionally empty main content area.

This slice establishes the composition and styling conventions before feature migration begins.

## Development component lab

`/lab` is a development-only workbench. Each visual component receives an
isolated example with editable props and relevant state simulations.

The lab has two deliberately different outputs:

- `COPY PROPS` produces JSX but does not write source files.
- `APPLY TOKEN` sends declared design-token values to a local Vite development
  endpoint.

The endpoint accepts only tokens from a typed registry, validates their type and
range, and deterministically regenerates `src/styles/generated-tokens.css`.
Components, CSS Modules, and arbitrary project files are never rewritten by the
lab. Production builds contain neither the lab route nor the write endpoint.
