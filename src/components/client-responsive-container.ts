'use client';

import {
  type ComponentProps,
  createElement,
  type CSSProperties,
  type ReactNode,
  useSyncExternalStore,
} from 'react';
import { ResponsiveContainer } from 'recharts';

type ClientResponsiveContainerProps = ComponentProps<typeof ResponsiveContainer> & {
  children: ReactNode;
};

const noopSubscribe = () => () => {};

function getPlaceholderStyle({
  width = '100%',
  height = '100%',
  minWidth = 0,
  minHeight,
  maxHeight,
  style,
}: ClientResponsiveContainerProps): CSSProperties {
  return {
    ...style,
    width,
    height,
    minWidth,
    minHeight,
    maxHeight,
  };
}

export function ClientResponsiveContainer(props: ClientResponsiveContainerProps) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return createElement('div', {
      'aria-hidden': 'true',
      'data-chart-placeholder': 'true',
      className: props.className,
      style: getPlaceholderStyle(props),
    });
  }

  return createElement(ResponsiveContainer, props, props.children);
}
