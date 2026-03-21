# Security & Code Quality Review Findings

**Date**: 2026-03-21
**Reviewers**: Codex CLI (GPT-5.4, read-only sandbox) + Claude Opus 4.6
**Scope**: Full codebase (src/, middleware.ts, ~5,036 LOC)

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| HIGH | 6 | 6 |
| MEDIUM | 6 | 6 |
| LOW | 2 | 1 |
| INFO | 1 | 0 |
| **Total** | **15** | **13** |

## Fixed (Round 1)

- **SEC-003 (HIGH)**: Memory API uses MEMORY_DIR instead of WORKSPACE_DIR
- **SEC-005 (MEDIUM)**: Auth sha256 hash comparison, no short-circuit timing leak
- **SEC-006 (LOW)**: All 20 API routes return generic error messages
- **QA-004 (MEDIUM)**: 3 routes return HTTP 500 on error instead of 200

## Fixed (Round 2 — Deferred)

- **SEC-001 (HIGH)**: Migrated security.ts from execSync to execFileSync (no shell). Env vars
  (OPENCLAW_BIN, OPENCLAW_CONFIG_FILE, WORKSPACE_DIR) no longer interpolated into shell strings.
  Shell-dependent commands like cat/ls/printenv replaced with Node fs/process.env APIs.
- **SEC-002 (HIGH)**: CSRF protection added to middleware — blocks cross-site POST/PUT/DELETE
  via Sec-Fetch-Site and Origin header validation.
- **SEC-004 (MEDIUM)**: Config masking regex expanded to cover password, passphrase, privateKey,
  DSN, connection_string patterns.
- **QA-001 (HIGH)**: security.ts now uses structured CmdResult instead of swallowing errors as empty strings.
  (Also addresses QA-002.)
- **QA-003 (HIGH)**: useFetch hook checks res.ok, supports null URL, uses AbortController for cleanup.
- **QA-005 (MEDIUM)**: Config sanitizer extracted to shared config-sanitizer.ts — both routes use it.

## Remaining

- **QA-001** (partial): system.ts still uses sync I/O — async migration is a separate effort
- **QA-006-010**: Type safety, dead code, testing gaps

## Positive Findings

- All API routes consistently use requireDangerousOperationsEnabled() guard
- Middleware auth covers all routes via matcher
- No auth bypass found
- No SSRF sink found
- Session ID validated with regex
- Path traversal protection (resolvePathWithinRoot) correctly applied
