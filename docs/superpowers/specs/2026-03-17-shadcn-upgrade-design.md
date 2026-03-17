# Shadcn Upgrade Design

## Goal

Remove the remaining `claw-dash` dev-only Dependabot alert chain by upgrading the `shadcn` CLI dependency and refreshing its transitive lockfile entries to patched versions, while keeping the existing UI build and authoring flow intact.

## Current State

- `shadcn` is pinned at `^3.8.4` in `package.json`.
- The open alert is a development-only transitive vulnerability: `shadcn -> @modelcontextprotocol/sdk -> hono@4.12.5`.
- The `shadcn` subtree also carries a patch-level fix for `express-rate-limit`, and the repo's ESLint chain (`eslint -> file-entry-cache -> flat-cache -> flatted`) carries a separate patch-level fix for `flatted`, so the full installed graph must be verified rather than assumed.
- `components.json` and `src/app/globals.css` already follow the current shadcn project shape, so the likely work is dependency and lockfile refresh rather than component rewrites.

## Options Considered

### 1. Upgrade `shadcn`

Recommended as the starting point. It keeps the intended CLI workflow and removes the need to carry an old major version, but the resulting lockfile still needs to be checked for patched transitive versions.

### 2. Override `hono`

Lower-risk mechanically, but it leaves the root toolchain on an older release and requires keeping a transitive pin alive.

### 3. Remove `shadcn`

This would reduce the dependency surface but changes the maintenance workflow for UI updates and is larger than the security fix requires.

## Chosen Design

- Upgrade `shadcn` from `^3.8.4` to the current stable `^4.0.8`.
- Refresh the lockfile and inspect the resulting dependency tree to confirm `hono`, `express-rate-limit`, and `flatted` land on patched versions.
- Keep the project config shape (`components.json`, global CSS import, scripts) unless the new CLI version requires a minimal compatibility change.
- Add a regression test that fails while vulnerable `hono`, `express-rate-limit`, or `flatted` versions are present in the installed dependency graph and passes once the remediation is applied.
- Re-run the project verification suite and check the live Dependabot alert state after the update.

## Fallout Policy

If the `shadcn` major update changes any local assumptions, only the directly affected files will be adjusted. No unrelated refactors are part of this change.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit`
- `npm ls shadcn hono express-rate-limit flatted`
- `gh api repos/sirkhet-dev/claw-dash/dependabot/alerts`
