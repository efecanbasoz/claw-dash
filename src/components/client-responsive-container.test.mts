import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { ClientResponsiveContainer } from './client-responsive-container.ts';

type ResponsiveContainerElementProps = Omit<
  React.ComponentProps<typeof ClientResponsiveContainer>,
  'children'
>;

const ResponsiveContainerComponent = ClientResponsiveContainer as React.ComponentType<
  React.PropsWithChildren<ResponsiveContainerElementProps>
>;

function captureGlobalValue(name: string) {
  return Object.getOwnPropertyDescriptor(globalThis, name);
}

function setGlobalValue(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function restoreGlobalValue(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, name);
}

test('restoreGlobalValue removes globals that were originally absent', () => {
  const name = '__codex_temp_missing_global__';

  assert.equal(name in globalThis, false);

  setGlobalValue(name, 123);
  assert.equal((globalThis as Record<string, unknown>)[name], 123);

  restoreGlobalValue(name, undefined);

  assert.equal(name in globalThis, false);
});

test('restoreGlobalValue restores accessor-backed globals without leaking a data property', () => {
  const name = '__codex_temp_accessor_global__';
  let currentValue = 1;

  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    get: () => currentValue,
  });

  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, name);

  setGlobalValue(name, 2);
  restoreGlobalValue(name, originalDescriptor);

  const restoredDescriptor = Object.getOwnPropertyDescriptor(globalThis, name);

  assert.ok(restoredDescriptor);
  assert.equal(typeof restoredDescriptor.get, 'function');
  assert.equal('value' in restoredDescriptor, false);
  assert.equal((globalThis as Record<string, unknown>)[name], 1);

  currentValue = 3;
  assert.equal((globalThis as Record<string, unknown>)[name], 3);

  Reflect.deleteProperty(globalThis, name);
});

test('ClientResponsiveContainer omits chart children during server render', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ResponsiveContainerComponent,
      null,
      React.createElement('span', { 'data-chart-child': 'true' }, 'chart'),
    ),
  );

  assert.match(html, /data-chart-placeholder="true"/);
  assert.doesNotMatch(html, /data-chart-child="true"/);
});

test('ClientResponsiveContainer hydrates the placeholder into chart content on the client', async () => {
  const chartChild = React.createElement('span', { 'data-chart-child': 'true' }, 'chart');
  const element = React.createElement(
    ResponsiveContainerComponent,
    { width: 320, height: 180 },
    chartChild,
  );
  const html = renderToStaticMarkup(element);
  const dom = new JSDOM(`<html><body><div id="root">${html}</div></body></html>`);
  const previousGlobals = {
    window: captureGlobalValue('window'),
    document: captureGlobalValue('document'),
    navigator: captureGlobalValue('navigator'),
    Element: captureGlobalValue('Element'),
    HTMLElement: captureGlobalValue('HTMLElement'),
    Node: captureGlobalValue('Node'),
    Text: captureGlobalValue('Text'),
    Comment: captureGlobalValue('Comment'),
    MutationObserver: captureGlobalValue('MutationObserver'),
    IS_REACT_ACT_ENVIRONMENT: captureGlobalValue('IS_REACT_ACT_ENVIRONMENT'),
  };

  setGlobalValue('window', dom.window);
  setGlobalValue('document', dom.window.document);
  setGlobalValue('navigator', dom.window.navigator);
  setGlobalValue('Element', dom.window.Element);
  setGlobalValue('HTMLElement', dom.window.HTMLElement);
  setGlobalValue('Node', dom.window.Node);
  setGlobalValue('Text', dom.window.Text);
  setGlobalValue('Comment', dom.window.Comment);
  setGlobalValue('MutationObserver', dom.window.MutationObserver);
  setGlobalValue('IS_REACT_ACT_ENVIRONMENT', true);

  try {
    const container = dom.window.document.getElementById('root');
    const recoverableErrors: unknown[] = [];

    assert.ok(container);
    assert.ok(container.querySelector('[data-chart-placeholder="true"]'));

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError(error) {
          recoverableErrors.push(error);
        },
      });
      await Promise.resolve();
    });

    assert.equal(recoverableErrors.length, 0);
    assert.equal(container.querySelector('[data-chart-placeholder="true"]'), null);
    assert.ok(container.querySelector('[data-chart-child="true"]'));

    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
  } finally {
    dom.window.close();

    restoreGlobalValue('window', previousGlobals.window);
    restoreGlobalValue('document', previousGlobals.document);
    restoreGlobalValue('navigator', previousGlobals.navigator);
    restoreGlobalValue('Element', previousGlobals.Element);
    restoreGlobalValue('HTMLElement', previousGlobals.HTMLElement);
    restoreGlobalValue('Node', previousGlobals.Node);
    restoreGlobalValue('Text', previousGlobals.Text);
    restoreGlobalValue('Comment', previousGlobals.Comment);
    restoreGlobalValue('MutationObserver', previousGlobals.MutationObserver);
    restoreGlobalValue('IS_REACT_ACT_ENVIRONMENT', previousGlobals.IS_REACT_ACT_ENVIRONMENT);
  }
});

test('ClientResponsiveContainer hydration test surfaces recoverable mismatches', async () => {
  const chartChild = React.createElement('span', { 'data-chart-child': 'true' }, 'chart');
  const element = React.createElement(
    ResponsiveContainerComponent,
    { width: 320, height: 180 },
    chartChild,
  );
  const html = renderToStaticMarkup(element)
    .replace(/^<div/, '<section')
    .replace(/<\/div>$/, '</section>');
  const dom = new JSDOM(`<html><body><div id="root">${html}</div></body></html>`);
  const previousGlobals = {
    window: captureGlobalValue('window'),
    document: captureGlobalValue('document'),
    navigator: captureGlobalValue('navigator'),
    Element: captureGlobalValue('Element'),
    HTMLElement: captureGlobalValue('HTMLElement'),
    Node: captureGlobalValue('Node'),
    Text: captureGlobalValue('Text'),
    Comment: captureGlobalValue('Comment'),
    MutationObserver: captureGlobalValue('MutationObserver'),
    IS_REACT_ACT_ENVIRONMENT: captureGlobalValue('IS_REACT_ACT_ENVIRONMENT'),
  };

  setGlobalValue('window', dom.window);
  setGlobalValue('document', dom.window.document);
  setGlobalValue('navigator', dom.window.navigator);
  setGlobalValue('Element', dom.window.Element);
  setGlobalValue('HTMLElement', dom.window.HTMLElement);
  setGlobalValue('Node', dom.window.Node);
  setGlobalValue('Text', dom.window.Text);
  setGlobalValue('Comment', dom.window.Comment);
  setGlobalValue('MutationObserver', dom.window.MutationObserver);
  setGlobalValue('IS_REACT_ACT_ENVIRONMENT', true);

  try {
    const container = dom.window.document.getElementById('root');
    const recoverableErrors: unknown[] = [];

    assert.ok(container);

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError(error) {
          recoverableErrors.push(error);
        },
      });
      await Promise.resolve();
    });

    assert.ok(recoverableErrors.length > 0);

    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
  } finally {
    dom.window.close();

    restoreGlobalValue('window', previousGlobals.window);
    restoreGlobalValue('document', previousGlobals.document);
    restoreGlobalValue('navigator', previousGlobals.navigator);
    restoreGlobalValue('Element', previousGlobals.Element);
    restoreGlobalValue('HTMLElement', previousGlobals.HTMLElement);
    restoreGlobalValue('Node', previousGlobals.Node);
    restoreGlobalValue('Text', previousGlobals.Text);
    restoreGlobalValue('Comment', previousGlobals.Comment);
    restoreGlobalValue('MutationObserver', previousGlobals.MutationObserver);
    restoreGlobalValue('IS_REACT_ACT_ENVIRONMENT', previousGlobals.IS_REACT_ACT_ENVIRONMENT);
  }
});
