import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { ClientResponsiveContainer } from './client-responsive-container.ts';

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type ResponsiveContainerElementProps = Omit<
  React.ComponentProps<typeof ClientResponsiveContainer>,
  'children'
>;

const ResponsiveContainerComponent = ClientResponsiveContainer as React.ComponentType<
  React.PropsWithChildren<ResponsiveContainerElementProps>
>;

function setGlobalValue(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function restoreGlobalValue(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

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
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    Element: globalThis.Element,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    Text: globalThis.Text,
    Comment: globalThis.Comment,
    MutationObserver: globalThis.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT,
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

    assert.ok(container);
    assert.ok(container.querySelector('[data-chart-placeholder="true"]'));

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element);
      await Promise.resolve();
    });

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
