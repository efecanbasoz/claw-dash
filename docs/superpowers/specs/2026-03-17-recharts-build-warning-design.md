# Recharts Build Warning Design

## Goal

Eliminate the Recharts `ResponsiveContainer` width/height warnings that appear during `next build` without changing the runtime chart layout.

## Current State

- The dashboard charts are rendered in client components on `/`, `/costs`, and `/health`.
- Those charts use `ResponsiveContainer` directly.
- During static generation, Recharts initializes `ResponsiveContainer` with `initialDimension = { width: -1, height: -1 }`.
- Because build-time rendering has no measured parent size, Recharts logs warnings even though the browser layout is correct after hydration.

## Options Considered

### 1. Client-only chart container

Recommended. Wrap `ResponsiveContainer` in a small component that renders a placeholder during server render and only mounts the real chart container after hydration.

### 2. Hard-code `initialDimension`

This can suppress the warning, but it bakes guessed dimensions into the server render and is more fragile across layout changes.

### 3. Convert pages to fully dynamic rendering

This would also avoid the warning, but it is a larger behavior change than needed and would weaken static output for the affected pages.

## Chosen Design

- Create a reusable `ClientResponsiveContainer` component.
- On the server and during the first client render, output a size-preserving placeholder element instead of a Recharts container.
- After mount, render the real `ResponsiveContainer` with the same width/height behavior as today.
- Replace the five direct `ResponsiveContainer` usages on the dashboard, costs, and health pages with the new wrapper.
- Add a regression test proving that server rendering the wrapper does not render chart children.

## Verification

- `npm test -- src/components/client-responsive-container.test.mts`
- `npm test`
- `npm run build`
- Confirm the build output no longer contains the Recharts width/height warning text
