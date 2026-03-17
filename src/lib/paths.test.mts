import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePathWithinRoot } from './paths.ts';

const root = '/workspace/root';

test('resolvePathWithinRoot allows a markdown file inside the root', () => {
  const result = resolvePathWithinRoot(root, 'memory/notes/today.md', {
    allowedExtensions: ['.md'],
  });

  assert.equal(result?.relativePath, 'memory/notes/today.md');
  assert.equal(result?.fullPath, '/workspace/root/memory/notes/today.md');
});

test('resolvePathWithinRoot rejects absolute paths', () => {
  const result = resolvePathWithinRoot(root, '/tmp/payload.md', {
    allowedExtensions: ['.md'],
  });

  assert.equal(result, null);
});

test('resolvePathWithinRoot rejects parent-directory traversal', () => {
  const result = resolvePathWithinRoot(root, '../secrets.md', {
    allowedExtensions: ['.md'],
  });

  assert.equal(result, null);
});

test('resolvePathWithinRoot rejects blocked basenames', () => {
  const result = resolvePathWithinRoot(root, 'memory/auth.json', {
    blockedBasenames: ['auth.json'],
  });

  assert.equal(result, null);
});
