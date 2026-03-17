import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ClientResponsiveContainer } from './client-responsive-container.ts';

test('ClientResponsiveContainer omits chart children during server render', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ClientResponsiveContainer,
      null,
      React.createElement('span', { 'data-chart-child': 'true' }, 'chart'),
    ),
  );

  assert.match(html, /data-chart-placeholder="true"/);
  assert.doesNotMatch(html, /data-chart-child="true"/);
});
