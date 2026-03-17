# Recharts Build Warning Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Recharts `ResponsiveContainer` build-time warnings while preserving existing chart behavior in the browser.

**Architecture:** Add a small client-side wrapper around `ResponsiveContainer` that renders a placeholder during SSR and the initial hydration pass, then swap existing chart pages to use it. Guard the behavior with a server-render regression test and verify with a fresh production build.

**Tech Stack:** Next.js 16, React 19, Recharts 3, Node test runner, react-dom/server

---

## File Map

- Create: `docs/superpowers/specs/2026-03-17-recharts-build-warning-design.md`
- Create: `docs/superpowers/plans/2026-03-17-recharts-build-warning-fix.md`
- Create: `src/components/client-responsive-container.ts`
- Create: `src/components/client-responsive-container.test.mts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/costs/page.tsx`
- Modify: `src/app/health/page.tsx`

## Chunk 1: Add the regression test

### Task 1: Prove SSR does not render Recharts children

**Files:**
- Test: `src/components/client-responsive-container.test.mts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClientResponsiveContainer } from "./client-responsive-container.ts";

test("ClientResponsiveContainer omits chart children during server render", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ClientResponsiveContainer,
      null,
      React.createElement("span", { "data-chart-child": "true" }, "chart"),
    ),
  );

  assert.match(html, /data-chart-placeholder="true"/);
  assert.doesNotMatch(html, /data-chart-child="true"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/client-responsive-container.test.mts`
Expected: FAIL because the component does not exist yet

## Chunk 2: Implement the wrapper and adopt it

### Task 2: Replace direct `ResponsiveContainer` usage

**Files:**
- Create: `src/components/client-responsive-container.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/costs/page.tsx`
- Modify: `src/app/health/page.tsx`
- Test: `src/components/client-responsive-container.test.mts`

- [ ] **Step 1: Implement the minimal wrapper**

Create a wrapper that:
- returns a size-preserving placeholder before `useEffect` fires
- renders `ResponsiveContainer` after mount
- forwards width, height, minWidth, minHeight, className, and style

- [ ] **Step 2: Replace the existing imports/usages**

Use `ClientResponsiveContainer` in all five chart locations and remove direct `ResponsiveContainer` imports from those pages.

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `npm test -- src/components/client-responsive-container.test.mts`
Expected: PASS

## Chunk 3: Full verification

### Task 3: Prove the warning is gone

**Files:**
- No new files expected

- [ ] **Step 1: Run the full local test suite**

Run:

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 2: Run a production build and inspect the output**

Run:

```bash
npm run build
```

Expected: build succeeds and the output no longer contains `The width(-1) and height(-1) of chart should be greater than 0`

- [ ] **Step 3: Commit**

```bash
git add src/components/client-responsive-container.ts src/components/client-responsive-container.test.mts src/app/page.tsx src/app/costs/page.tsx src/app/health/page.tsx docs/superpowers/specs/2026-03-17-recharts-build-warning-design.md docs/superpowers/plans/2026-03-17-recharts-build-warning-fix.md
git commit -m "fix: suppress Recharts build warnings"
```
