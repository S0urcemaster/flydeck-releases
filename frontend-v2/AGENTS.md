# Flydeck Frontend V2 Agent Rules

## Core principle

Build the interface like Lego: every visible whole is composed from smaller, reusable, self-contained parts.

Components must explain themselves through their names, public contracts,
composition, and catalog examples. Before implementing a component, control,
interaction, or visual pattern from scratch, search the existing project for
an established example and follow or reuse it when suitable. Build a custom
solution only when no suitable precedent exists.

## Component ownership

- Every visible application component composes `Base` directly or through a
  documented application base component and exposes the resulting
  `BaseStyleProps` contract.
- Declare every shared property once on the lowest common component that owns
  it. Derived components inherit that public contract instead of redeclaring
  or privately recreating the property, and their lab property view exposes
  the complete inherited component chain.
- A component owns its markup, CSS Module, variants, behavior, accessibility, and tests.
- Keep component files together in one directory.
- Export only the component's documented public API.
- Never style another component's internal elements from a parent, module, or
  application stylesheet.
- Never depend on a child's private class names or DOM order.
- Almost every visible or interactive whole is a catalogued component in its
  own dependency zone.
- The lowest component that owns an interaction also owns the required native
  DOM elements; native elements do not require one wrapper component per node.

## Styling

- Use CSS Modules for component-local styles.
- Keep only tokens, reset, and base document rules global.
- Use design tokens for every design color, spacing value, control height, font size, radius, shadow, and motion duration that is shared.
- Do not add raw design colors outside token files.
- An editable component property is the single source of truth for that value.
  Do not repeat it as a component CSS default, fallback, or hidden override.
  Required initial values belong in the persisted component-property data.
- Express visual states through explicit props or semantic data attributes.
- Selected, active, success, error, and other semantic states use theme tokens;
  a component must never encode the appearance of a particular theme.
- Do not use positional selectors such as `:first-child` to assign component meaning.

## Composition

- Prefer small primitives and controls over feature-specific copies.
- Prefer children and focused variants over large configuration objects.
- Keep state at the lowest level that can own it correctly.
- Put reusable state transitions in hooks or controls.
- Do not create wrapper components that add no contract, behavior, or styling.
- Do not create abstractions for hypothetical reuse.

## Target viewport

- Flydeck is a mobile web app; optimize behavior and composition for phones.
- The app shell always uses the full available phone width.
- Wide screens only center the unchanged mobile interface; they do not introduce a desktop layout.
- Components must not assume the desktop maximum width.
- Unintentional horizontal page scrolling is a layout defect.
- A component may scroll horizontally only when its public contract explicitly defines that behavior.
- Respect viewport safe areas and the changing visual viewport caused by virtual keyboards.

## Quality

- Preserve touch, pointer, keyboard, focus, and screen-reader behavior.
- Avoid automatic focus and scrolling unless the component contract explicitly requires it.
- Guard asynchronous destructive actions synchronously and disable their controls while pending.
- Add focused tests for state transitions and parsing logic.
- Run tests, build, lint, and whitespace checks for changed code.
- Client diagnostics use only passively browser-exposed information unless a future feature explicitly documents and requests a permission.

## Component lab

- Every visual component gets a development-only example in `/lab`.
- Application components and modules live in the application dependency zone;
  lab scaffold components live in the lab dependency zone.
- Register every application component, lab scaffold component, and theme in its respective catalog; the catalogs, not leftover directories, define what exists.
- Application components and modules never import lab components.
- Lab scaffold components never import or compose application components.
- The lab harness may import public application types and metadata and may
  render the application component currently under inspection as an isolated
  preview; this exception does not make that component part of the lab
  scaffold dependency graph.
- App and lab component systems may intentionally contain equivalent controls;
  reuse never crosses the dependency boundary.
- App and lab components use separate catalogs; identical component names are allowed across the boundary.
- Lab writes may contain only values declared by the typed token, color, theme,
  or component-property contracts.
- The development endpoint must validate the complete payload, including names, types, ranges, units, themes, component keys, and supported properties, before any write.
- Theme data owns its colors and declared design tokens. Persisting a theme
  stores the complete validated theme and deterministically derives the
  active runtime CSS from it.
- Component-property data is persisted separately from theme data.
- Persisted generated data is authoritative; derived runtime files must remain
  synchronized with their authoritative source.
- The lab must never rewrite TSX, component CSS Modules, arbitrary CSS, or files outside `frontend-v2`.
- Persisted changes remain ordinary, deterministic, reviewable Git changes.
- Lab UI and its write endpoint must not be available in production builds.

## Migration safety

- The existing `frontend` is the running reference and must remain operational.
- Build V2 independently inside `frontend-v2`.
- Migrate one complete vertical slice at a time.
- Do not silently change established behavior while extracting a component.
- Record intentional deviations from V1 in the rebuild plan.

## Context handoff

- Read this file completely before changing V2.
- Read `CURRENT-STATE.md` for the implemented surface, generated files, verification commands, and immediate continuation point.
- Read `rebuild-plan.md` when changing architecture or migration order.
- Treat this file as durable policy and `CURRENT-STATE.md` as replaceable project state; update the latter whenever a completed slice changes the handoff materially.
