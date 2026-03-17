import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function parseVersion(version: string) {
  return version.split('.').map((part) => Number.parseInt(part, 10));
}

function isVersionAtLeast(actual: string, minimum: string) {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(actualParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (actualPart > minimumPart) {
      return true;
    }

    if (actualPart < minimumPart) {
      return false;
    }
  }

  return true;
}

function getInstalledPackageVersion(packageName: string) {
  const packageJsonPath = join(process.cwd(), 'node_modules', packageName, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  assert.equal(typeof version, 'string');

  return version;
}

test('installed hono is at least 4.12.7', () => {
  const version = getInstalledPackageVersion('hono');

  assert.equal(isVersionAtLeast(version, '4.12.7'), true);
});

test('installed express-rate-limit is at least 8.2.2', () => {
  const version = getInstalledPackageVersion('express-rate-limit');

  assert.equal(isVersionAtLeast(version, '8.2.2'), true);
});

test('installed flatted is at least 3.4.0', () => {
  const version = getInstalledPackageVersion('flatted');

  assert.equal(isVersionAtLeast(version, '3.4.0'), true);
});
