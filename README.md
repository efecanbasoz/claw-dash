# Claw Dash

> Self-hosted operations dashboard for OpenClaw workspaces.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)

Claw Dash is a self-hosted operations dashboard for monitoring and managing an OpenClaw workspace. It provides pages and APIs for sessions, usage stats, cron jobs, memory files, git activity, and security posture snapshots.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Session analytics** — Token and cost tracking with visual breakdowns
- **Live activity feed** — Real-time workspace activity monitoring
- **Cron inspection** — View and control scheduled jobs
- **Memory browser** — Browse and edit workspace memory files
- **Security overview** — System and security posture panels
- **API-first** — All data exposed via Next.js route handlers

---

## Tech Stack

- **Next.js 16** — App Router
- **React 19** + **TypeScript 5**
- **Tailwind CSS v4** + shadcn-style UI patterns
- **Recharts** + **framer-motion**

---

## Getting Started

```bash
git clone https://github.com/efecanbasoz/claw-dash.git
cd claw-dash
npm install
npm run dev
```

The app runs on `http://localhost:3100` by default.

---

## Environment Variables

Create a `.env.local` file (or export variables in your shell):

```bash
OPENCLAW_BIN=openclaw
OPENCLAW_DIR=$HOME/.openclaw
OPENCLAW_CONFIG_FILE=$HOME/.openclaw/openclaw.json
CLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace
CLAW_REPOS_DIR=$HOME/.openclaw/workspace/repos
ENABLE_DANGEROUS_OPERATIONS=false
DASHBOARD_AUTH_ENABLED=***
DASHBOARD_AUTH_USERNAME=***
DASHBOARD_AUTH_PASSWORD=***
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

---

## Usage

### Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run linter
npm run typecheck  # Type checking
npm run test       # Run tests
```

---

## Security

### Defaults

Sensitive endpoints are disabled by default. Enable them explicitly with:

```bash
ENABLE_DANGEROUS_OPERATIONS=true
```

The dashboard supports built-in Basic Auth. For any deployment that enables dangerous operations, auth must be configured or the sensitive endpoints will refuse to run.

### Threat Model

- Route handlers read local files and system metadata
- Some handlers execute local commands
- Dangerous operations require both `ENABLE_DANGEROUS_OPERATIONS=true` and dashboard auth credentials
- Do not expose this dashboard publicly without network/auth controls
- Prefer running behind VPN, reverse proxy auth, or private network boundaries

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Run `npm run typecheck && npm run test` to verify
4. Commit your changes
5. Push to the branch and open a Pull Request

---

## License

[Apache-2.0](./LICENSE)
