import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDangerousOperationsConfigError,
  getDashboardAuthConfig,
  isAuthorizedRequest,
} from './dashboard-auth.ts';

test('getDashboardAuthConfig reports configured auth when enabled and credentials exist', () => {
  const config = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });

  assert.deepEqual(config, {
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

  assert.equal(
    getDangerousOperationsConfigError(true, auth),
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

  assert.equal(isAuthorizedRequest(header, auth), true);
});

test('isAuthorizedRequest rejects invalid credentials', () => {
  const auth = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });
  const header = `Basic ${Buffer.from('admin:nope').toString('base64')}`;

  assert.equal(isAuthorizedRequest(header, auth), false);
});
