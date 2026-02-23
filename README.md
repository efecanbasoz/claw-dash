# Claw Dash

Claw Dash is a self-hosted operations dashboard for monitoring and managing an OpenClaw workspace.

It provides pages and APIs for sessions, usage stats, cron jobs, memory files, git activity, and security posture snapshots.

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

## Environment Variables

Create a `.env.local` file (or export variables in your shell):

```bash
OPENCLAW_BIN=openclaw
OPENCLAW_DIR=$HOME/.openclaw
OPENCLAW_CONFIG_FILE=$HOME/.openclaw/openclaw.json
CLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace
CLAW_REPOS_DIR=$HOME/.openclaw/workspace/repos
ENABLE_DANGEROUS_OPERATIONS=false
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
```

## Threat Model Notes

- Route handlers read local files and system metadata.
- Some handlers execute local commands.
- Do not expose this dashboard publicly without network/auth controls.
- Prefer running behind VPN, reverse proxy auth, or private network boundaries.

## License

MIT
