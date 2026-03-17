# Claw Dash

Claw Dash is a self-hosted operations dashboard for monitoring and managing an OpenClaw workspace.

It provides pages and APIs for sessions, usage stats, cron jobs, memory files, git activity, and security posture snapshots.

<img width="2163" height="1103" alt="Claw-Dash" src="https://github.com/user-attachments/assets/e18078af-2ba7-4496-ad82-108aa4e019a8" />


## Highlights

- Session and token/cost analytics
- Live activity feed
- Cron inspection and control
- Workspace memory browser/editor
- Security and system overview panels
- API-first architecture with Next.js route handlers

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript 5
- Tailwind CSS v4 + shadcn-style UI patterns
- Recharts + framer-motion

## Security Defaults

This project performs host-level reads and can execute operational commands.

To reduce accidental exposure, sensitive endpoints are disabled by default.

Enable them explicitly with:

```bash
ENABLE_DANGEROUS_OPERATIONS=true
```

The dashboard also supports built-in Basic Auth. For any deployment that enables dangerous operations, auth must be configured or the sensitive endpoints will refuse to run.

## Environment Variables

Create a `.env.local` file (or export variables in your shell):

```bash
OPENCLAW_BIN=openclaw
OPENCLAW_DIR=$HOME/.openclaw
OPENCLAW_CONFIG_FILE=$HOME/.openclaw/openclaw.json
CLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace
CLAW_REPOS_DIR=$HOME/.openclaw/workspace/repos
ENABLE_DANGEROUS_OPERATIONS=false
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_AUTH_USERNAME=admin
DASHBOARD_AUTH_PASSWORD=change-me
```

Optional:

```bash
OPENCLAW_BUILTIN_SKILLS_DIR=
CLAW_AGENTS_DIR=
CLAW_CRON_FILE=
CLAW_CRON_RUNS_DIR=
CLAW_MEMORY_DIR=
CLAW_AUDIT_LOG_FILE=
```

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3100` by default.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

## Threat Model Notes

- Route handlers read local files and system metadata.
- Some handlers execute local commands.
- Dangerous operations now require both `ENABLE_DANGEROUS_OPERATIONS=true` and dashboard auth credentials.
- Do not expose this dashboard publicly without network/auth controls.
- Prefer running behind VPN, reverse proxy auth, or private network boundaries.

## License

MIT
