import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('node:crypto');
  vi.resetModules();
});

test('isAuthorizedRequest does not hash credentials before comparing them', async () => {
  const createHash = vi.fn(() => {
    throw new Error('createHash should not be used for dashboard auth');
  });

  vi.doMock('node:crypto', async () => {
    const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
    return {
      ...actual,
      createHash,
    };
  });

  const { getDashboardAuthConfig, isAuthorizedRequest } = await import('@/lib/dashboard-auth');
  const auth = getDashboardAuthConfig({
    DASHBOARD_AUTH_ENABLED: 'true',
    DASHBOARD_AUTH_USERNAME: 'admin',
    DASHBOARD_AUTH_PASSWORD: 'secret',
  });
  const header = `Basic ${Buffer.from('admin:secret').toString('base64')}`;

  expect(isAuthorizedRequest(header, auth)).toBe(true);
  expect(createHash).not.toHaveBeenCalled();
});
