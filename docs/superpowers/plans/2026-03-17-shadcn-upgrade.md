# Shadcn Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `shadcn` and refresh the affected transitive packages to clear the remaining dev-only security alerts without breaking the dashboard toolchain.

**Architecture:** Treat the work as a dependency remediation with a small regression guard. First add a failing dependency-security test, then upgrade the CLI, then refresh the vulnerable transitive entries that remain pinned below their patched ranges, and only patch local files if the new CLI version actually affects them.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Node test runner, npm, GitHub Dependabot API

---

## File Map

- Create: `docs/superpowers/specs/2026-03-17-shadcn-upgrade-design.md`
- Create: `docs/superpowers/plans/2026-03-17-shadcn-upgrade.md`
- Create: `src/lib/dependency-security.test.mts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Possibly modify: `components.json`
- Possibly modify: `src/app/globals.css`
- Possibly modify: `README.md`

## Chunk 1: Add the regression guard

### Task 1: Detect vulnerable installed transitive packages

**Files:**
- Test: `src/lib/dependency-security.test.mts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("installed hono is at least 4.12.7", () => {
  const packageLockPath = join(process.cwd(), "package-lock.json");
  const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
  const honoVersion = packageLock.packages["node_modules/hono"]?.version;

  assert.equal(honoVersion, "4.12.7");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="installed hono is at least 4.12.7"`
Expected: FAIL because the installed versions are below the patched minimums

- [ ] **Step 3: Commit**

```bash
git add src/lib/dependency-security.test.mts docs/superpowers/specs/2026-03-17-shadcn-upgrade-design.md docs/superpowers/plans/2026-03-17-shadcn-upgrade.md
git commit -m "docs: add shadcn upgrade plan"
```

## Chunk 2: Upgrade and adapt

### Task 2: Move `shadcn` to the current stable release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Possibly modify: `components.json`
- Possibly modify: `src/app/globals.css`
- Possibly modify: `README.md`
- Test: `src/lib/dependency-security.test.mts`

- [ ] **Step 1: Update the dependency**

Change `shadcn` from `^3.8.4` to `^4.0.8` in `package.json`, then run `npm install`.

- [ ] **Step 2: Inspect fallout**

Run:

```bash
npm ls shadcn hono
```

Expected: `shadcn@4.0.8`, but the transitive packages may still need a follow-up patch-level refresh.

- [ ] **Step 3: Refresh vulnerable transitive packages and apply the minimal compatibility fix if needed**

Run:

```bash
npm update hono express-rate-limit flatted
```

Examples:
- Update config shape in `components.json`
- Adjust `src/app/globals.css` imports if the CLI package changed their location
- Update README setup instructions if the CLI usage changed

- [ ] **Step 4: Run the regression test to verify it passes**

Run: `npm test -- --test-name-pattern="installed hono is at least 4.12.7"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components.json src/app/globals.css README.md src/lib/dependency-security.test.mts
git commit -m "build: upgrade shadcn"
```

## Chunk 3: Full verification

### Task 3: Prove the remediation

**Files:**
- No new files expected

- [ ] **Step 1: Run the local verification suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit
```

Expected: all commands exit `0`

- [ ] **Step 2: Check the remote alert state**

Run:

```bash
gh api repos/sirkhet-dev/claw-dash/dependabot/alerts --jq '.[] | select(.state=="open") | .dependency.package.name'
```

Expected: no open `hono`, `express-rate-limit`, or `flatted` alert remains once the change is pushed

- [ ] **Step 3: Commit verification-only follow-up if any fallout fix was required**

```bash
git add -A
git commit -m "chore: verify shadcn remediation"
```
