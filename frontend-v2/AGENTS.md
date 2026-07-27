# Flydeck Frontend V2 Agent Rules

## Core principle

Build the interface like Lego: every visible whole is composed from smaller, reusable, self-contained parts.

## Component ownership

- A component owns its markup, CSS Module, variants, behavior, accessibility, and tests.
- Keep component files together in one directory.
- Export only the component's documented public API.
- Never style another component's internal elements from a parent or feature stylesheet.
- Never depend on a child's private class names or DOM order.

## Styling

- Use CSS Modules for component-local styles.
- Keep only tokens, reset, and base document rules global.
- Use design tokens for every design color, spacing value, control height, font size, radius, shadow, and motion duration that is shared.
- Do not add raw design colors outside token files.
- Express visual states through explicit props or semantic data attributes.
- Do not use positional selectors such as `:first-child` to assign component meaning.

## Composition

- Prefer small primitives and controls over feature-specific copies.
- Prefer children and focused variants over large configuration objects.
- Keep state at the lowest level that can own it correctly.
- Put reusable state transitions in hooks or controls.
- Do not create wrapper components that add no contract, behavior, or styling.
- Do not create abstractions for hypothetical reuse.

## Quality

- Preserve touch, pointer, keyboard, focus, and screen-reader behavior.
- Avoid automatic focus and scrolling unless the component contract explicitly requires it.
- Guard asynchronous destructive actions synchronously and disable their controls while pending.
- Add focused tests for state transitions and parsing logic.
- Run tests, build, lint, and whitespace checks for changed code.

## Component lab

- Every visual component gets a development-only example in `/lab`.
- The lab may edit component props and simulate states locally without changing source files.
- `COPY PROPS` may generate JSX for deliberate manual use.
- `APPLY TOKEN` may write only tokens declared in the typed lab token registry.
- The development endpoint must validate token name, type, range, and unit before writing.
- Token changes are written deterministically only to `src/styles/generated-tokens.css`.
- The lab must never rewrite TSX, component CSS Modules, arbitrary CSS, or files outside `frontend-v2`.
- Applied token changes remain ordinary, reviewable Git changes.
- Lab UI and its write endpoint must not be available in production builds.

## Migration safety

- The existing `frontend` is the running reference and must remain operational.
- Build V2 independently inside `frontend-v2`.
- Migrate one complete vertical slice at a time.
- Do not silently change established behavior while extracting a component.
- Record intentional deviations from V1 in the rebuild plan.
