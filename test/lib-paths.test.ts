import { expect, test } from 'vitest';

import { resolvePathWithinRoot } from '@/lib/paths';

const root = '/workspace/root';

test('resolvePathWithinRoot allows a markdown file inside the root', () => {
  const result = resolvePathWithinRoot(root, 'memory/notes/today.md', {
    allowedExtensions: ['.md'],
  });

  expect(result?.relativePath).toBe('memory/notes/today.md');
  expect(result?.fullPath).toBe('/workspace/root/memory/notes/today.md');
});

test('resolvePathWithinRoot rejects absolute paths', () => {
  const result = resolvePathWithinRoot(root, '/tmp/payload.md', {
    allowedExtensions: ['.md'],
  });

  expect(result).toBe(null);
});

test('resolvePathWithinRoot rejects parent-directory traversal', () => {
  const result = resolvePathWithinRoot(root, '../secrets.md', {
    allowedExtensions: ['.md'],
  });

  expect(result).toBe(null);
});

test('resolvePathWithinRoot rejects blocked basenames', () => {
  const result = resolvePathWithinRoot(root, 'memory/auth.json', {
    blockedBasenames: ['auth.json'],
  });

  expect(result).toBe(null);
});
