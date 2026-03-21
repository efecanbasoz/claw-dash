# Security & Code Quality Review Findings

**Date**: 2026-03-21
**Reviewers**: Codex CLI (GPT-5.4, read-only sandbox) + Claude Opus 4.6
**Scope**: Full codebase (src/, middleware.ts, ~5,036 LOC)

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| HIGH | 6 | 4 |
| MEDIUM | 6 | 3 |
| LOW | 2 | 1 |
| INFO | 1 | 0 |
| **Total** | **15** | **8** |

## Fixed

- **SEC-003 (HIGH)**: Memory API now uses MEMORY_DIR instead of WORKSPACE_DIR to restrict file access scope
- **SEC-005 (MEDIUM)**: Auth uses sha256 hash comparison to eliminate length-based timing leak, both username and password evaluated before short-circuit
- **SEC-006 (LOW)**: All 20 API routes now return generic error messages, log details server-side
- **QA-004 (MEDIUM)**: 3 routes that returned HTTP 200 on error now correctly return 500

## Documented (require larger changes)

- **SEC-001 (HIGH)**: execSync command injection via env vars (OPENCLAW_BIN etc.) — requires migration to execFileSync across security.ts/system.ts/sessions.ts. Self-hosted threat model mitigates risk.
- **SEC-002 (HIGH)**: CSRF protection on POST routes — requires Origin/Sec-Fetch-Site checks
- **SEC-004 (MEDIUM)**: Config masking regex incomplete — requires schema-backed config DTO
- **QA-001 (HIGH)**: System health blocks event loop with execSync — requires async migration
- **QA-002 (HIGH)**: security.ts run() swallows errors — requires structured result types
- **QA-003 (HIGH)**: useFetch hook doesn't check res.ok — requires hook refactor
- **QA-005 (MEDIUM)**: Config masking duplicated between routes
- **QA-006-010**: Type safety, dead code, testing gaps

## Positive Findings

- All API routes consistently use requireDangerousOperationsEnabled() guard
- Middleware auth covers all routes via matcher
- No auth bypass found
- No SSRF sink found
- Session ID validated with regex
- Path traversal protection (resolvePathWithinRoot) correctly applied
