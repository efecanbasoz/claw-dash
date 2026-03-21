import { expect, test } from 'vitest';

import {
  getDangerousOperationsConfigError,
  getDashboardAuthConfig,
  isAuthorizedRequest,
} from '@/lib/dashboard-auth';

test('getDashboardAuthConfig reports configured auth when enabled and credentials exist', () => {
  const config = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });

  expect(config).toEqual({
    enabled: true,
    configured: true,
    username: 'admin',
    password: 'secret',
  });
});

test('getDangerousOperationsConfigError requires auth when dangerous operations are enabled', () => {
  const auth = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'false',
    DASHBOARD_AUTH_USERNAME: '',
    DASHBOARD_AUTH_PASSWORD: '',
  });

  expect(getDangerousOperationsConfigError(true, auth)).toBe(
    'Dangerous operations require dashboard auth. Set DASHBOARD_AUTH_ENABLED=true and configure DASHBOARD_AUTH_USERNAME/DASHBOARD_AUTH_PASSWORD.',
  );
});

test('isAuthorizedRequest accepts a matching basic auth header', () => {
  const auth = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });
  const header = `Basic ${Buffer.from('admin:secret').toString('base64')}`;

  expect(isAuthorizedRequest(header, auth)).toBe(true);
});

test('isAuthorizedRequest rejects invalid credentials', () => {
  const auth = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });
  const header = `Basic ${Buffer.from('admin:nope').toString('base64')}`;

  expect(isAuthorizedRequest(header, auth)).toBe(false);
});
