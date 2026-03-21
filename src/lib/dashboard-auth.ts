import { timingSafeEqual, createHash } from 'node:crypto';

export interface DashboardAuthConfig {
  enabled: boolean;
  configured: boolean;
  username: string;
  password: string;
}

type AuthEnv = Record<string, string | undefined>;

function getEnvValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

// SEC-005: Compare fixed-length hashes to avoid length-based timing leaks
function safeEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

export function getDashboardAuthConfig(env: AuthEnv = process.env): DashboardAuthConfig {
  const username = getEnvValue(env.DASHBOARD_AUTH_USERNAME);
  const password = getEnvValue(env.DASHBOARD_AUTH_PASSWORD);
  const enabled = env.DASHBOARD_AUTH_ENABLED === 'true';

  return {
    enabled,
    configured: enabled && username.length > 0 && password.length > 0,
    username,
    password,
  };
}

export function isAuthorizedRequest(
  authorizationHeader: string | null | undefined,
  config: DashboardAuthConfig = getDashboardAuthConfig(),
): boolean {
  if (!config.enabled) return true;
  if (!config.configured) return false;
  if (!authorizationHeader?.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(authorizationHeader.slice(6), 'base64').toString('utf-8');
    const delimiter = decoded.indexOf(':');
    if (delimiter < 0) return false;

    const username = decoded.slice(0, delimiter);
    const password = decoded.slice(delimiter + 1);
    // SEC-005: Evaluate both checks to prevent short-circuit timing leak
    const uOk = safeEqual(username, config.username);
    const pOk = safeEqual(password, config.password);
    return uOk && pOk;
  } catch {
    return false;
  }
}

export function getDangerousOperationsConfigError(
  dangerousOperationsEnabled: boolean,
  config: DashboardAuthConfig = getDashboardAuthConfig(),
): string | null {
  if (!dangerousOperationsEnabled) return null;
  if (config.configured) return null;

  return 'Dangerous operations require dashboard auth. Set DASHBOARD_AUTH_ENABLED=true and configure DASHBOARD_AUTH_USERNAME/DASHBOARD_AUTH_PASSWORD.';
}
