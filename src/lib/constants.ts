import path from 'path';

export const HOME = process.env.HOME || process.cwd();
export const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(HOME, '.openclaw');
export const AGENTS_DIR = process.env.CLAW_AGENTS_DIR || path.join(OPENCLAW_DIR, 'agents');
export const CRON_FILE = process.env.CLAW_CRON_FILE || path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
export const CRON_RUNS_DIR = process.env.CLAW_CRON_RUNS_DIR || path.join(OPENCLAW_DIR, 'cron', 'runs');
export const WORKSPACE_DIR = process.env.CLAW_WORKSPACE_DIR || path.join(OPENCLAW_DIR, 'workspace');
export const MEMORY_DIR = process.env.CLAW_MEMORY_DIR || path.join(WORKSPACE_DIR, 'memory');
export const LOGS_FILE = process.env.CLAW_AUDIT_LOG_FILE || path.join(OPENCLAW_DIR, 'logs', 'config-audit.jsonl');
export const REPOS_DIR = process.env.CLAW_REPOS_DIR || path.join(WORKSPACE_DIR, 'repos');
export const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw';
export const OPENCLAW_CONFIG_FILE = process.env.OPENCLAW_CONFIG_FILE || path.join(OPENCLAW_DIR, 'openclaw.json');
export const OPENCLAW_BUILTIN_SKILLS_DIR = process.env.OPENCLAW_BUILTIN_SKILLS_DIR || '';
export const ENABLE_DANGEROUS_OPERATIONS = process.env.ENABLE_DANGEROUS_OPERATIONS === 'true';

export const AGENT_IDS = [
  'main', 'coder', 'coder-claude', 'coder-codex', 'code-reviewer', 'backend-master',
  'researcher', 'ux-ui-reviewer', 'prompt-master', 'skill-creator', 'monitor',
  'code-quality-reviewer', 'code-security-analyzer', 'product-manager', 'plugin-creator'
] as const;

export const SENSITIVE_FILES = ['auth.json', 'auth-profiles.json'];
