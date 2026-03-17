# Shadcn Upgrade Design

## Goal

Remove the remaining `claw-dash` Dependabot alert by upgrading the `shadcn` CLI dependency to a version that no longer pulls vulnerable `hono` releases, while keeping the existing UI build and authoring flow intact.

## Current State

- `shadcn` is pinned at `^3.8.4` in `package.json`.
- The open alert is a development-only transitive vulnerability: `shadcn -> @modelcontextprotocol/sdk -> hono@4.12.5`.
- `components.json` and `src/app/globals.css` already follow the current shadcn project shape, so the likely work is dependency and lockfile refresh rather than component rewrites.

## Options Considered

### 1. Upgrade `shadcn`

Recommended. This fixes the alert at the source dependency, keeps the intended CLI workflow, and avoids a permanent manual override.

### 2. Override `hono`

Lower-risk mechanically, but it leaves the root toolchain on an older release and requires keeping a transitive pin alive.

### 3. Remove `shadcn`

This would reduce the dependency surface but changes the maintenance workflow for UI updates and is larger than the security fix requires.

## Chosen Design

- Upgrade `shadcn` from `^3.8.4` to the current stable `^4.0.8`.
- Refresh the lockfile and inspect the resulting dependency tree to confirm `hono` is no longer on a vulnerable version.
- Keep the project config shape (`components.json`, global CSS import, scripts) unless the new CLI version requires a minimal compatibility change.
- Add a regression test that fails while a vulnerable `hono` is present in the installed dependency graph and passes once the upgrade is applied.
- Re-run the project verification suite and check the live Dependabot alert state after the update.

## Fallout Policy

If the `shadcn` major update changes any local assumptions, only the directly affected files will be adjusted. No unrelated refactors are part of this change.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npm ls shadcn hono`
- `gh api repos/sirkhet-dev/claw-dash/dependabot/alerts`
