'use client';

import { TerminalLine } from './TerminalLine';

interface TerminalMessages {
  terminalTitle: string;
  terminalCmd: string;
  terminalInstalling: string;
  terminalRulesSynced: string;
  terminalAgents: string;
  terminalWorkflow: string;
  terminalCursorrules: string;
  terminalClaudeMd: string;
  terminalCodex: string;
  terminalAntigravity: string;
  terminalQ: string;
  terminalKiro: string;
  terminalReady: string;
}

interface TerminalDemoProps {
  messages: TerminalMessages;
}

const toolFiles = [
  'terminalCursorrules',
  'terminalClaudeMd',
  'terminalCodex',
  'terminalAntigravity',
  'terminalQ',
  'terminalKiro',
] as const;

export const TerminalDemo = ({ messages }: TerminalDemoProps) => (
  <div
    role="region"
    aria-label="Terminal demo showing codingbuddy installation"
    className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-terminal-border bg-terminal-bg shadow-lg glow-purple"
  >
    {/* Title bar */}
    <div className="flex items-center gap-2 border-b border-terminal-border bg-terminal-bg/80 px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="size-3 rounded-full bg-terminal-red/80" />
        <div className="size-3 rounded-full bg-terminal-yellow/80" />
        <div className="size-3 rounded-full bg-terminal-green/80" />
      </div>
      <span className="ml-2 font-mono text-xs text-terminal-muted">{messages.terminalTitle}</span>
    </div>

    {/* Terminal content */}
    <div className="space-y-1 p-4">
      <TerminalLine prefix="$" text={messages.terminalCmd} />
      <div className="h-2" aria-hidden="true" />
      <TerminalLine prefix="◆" text={messages.terminalInstalling} color="yellow" />
      <TerminalLine prefix="✓" text={messages.terminalRulesSynced} color="green" />
      <TerminalLine prefix="✓" text={messages.terminalAgents} color="green" />
      <TerminalLine prefix="✓" text={messages.terminalWorkflow} color="green" />

      <div className="h-2" aria-hidden="true" />

      {/* Tool files box */}
      <div className="ml-4 space-y-0.5 rounded border border-terminal-border/50 p-2">
        {toolFiles.map(key => (
          <div key={key} className="flex items-center gap-2 font-mono text-xs">
            <span className="text-terminal-text">{messages[key]}</span>
            <span className="text-terminal-green" aria-hidden="true">
              ✓
            </span>
          </div>
        ))}
      </div>

      <div className="h-2" aria-hidden="true" />
      <TerminalLine prefix=">" text={messages.terminalReady} color="green" />
      <span
        className="ml-4 inline-block h-4 w-2 animate-blink bg-terminal-green"
        aria-hidden="true"
      />
    </div>
  </div>
);

export type { TerminalMessages, TerminalDemoProps };
