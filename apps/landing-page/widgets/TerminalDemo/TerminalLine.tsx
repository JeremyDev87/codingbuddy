'use client';

interface TerminalLineProps {
  prefix?: '>' | '$' | '◆' | '✓' | '✗';
  text: string;
  color?: 'green' | 'purple' | 'red' | 'yellow' | 'muted' | 'default';
}

const colorMap = {
  green: 'text-terminal-green',
  purple: 'text-terminal-purple',
  red: 'text-terminal-red',
  yellow: 'text-terminal-yellow',
  muted: 'text-terminal-muted',
  default: 'text-terminal-text',
} as const;

const prefixColorMap = {
  '>': 'text-terminal-green',
  $: 'text-terminal-green',
  '◆': 'text-terminal-yellow',
  '✓': 'text-terminal-green',
  '✗': 'text-terminal-red',
} as const;

export const TerminalLine = ({ prefix, text, color = 'default' }: TerminalLineProps) => (
  <div className="flex gap-2 font-mono text-sm leading-relaxed">
    {prefix && (
      <span className={prefixColorMap[prefix]} aria-hidden="true">
        {prefix}
      </span>
    )}
    <span className={colorMap[color]}>{text}</span>
  </div>
);
