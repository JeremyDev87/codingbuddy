import React from 'react';
import { Text } from 'ink';
import { buildProgressBar } from './progress-bar.pure';

const DEFAULT_WIDTH = 10;

export interface ProgressBarProps {
  value: number;
  width?: number;
  color?: string;
}

export function ProgressBar({
  value,
  width = DEFAULT_WIDTH,
  color,
}: ProgressBarProps): React.ReactElement {
  const bar = buildProgressBar(value, width);
  return <Text color={color}>{bar}</Text>;
}
