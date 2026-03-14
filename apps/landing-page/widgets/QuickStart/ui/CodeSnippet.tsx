'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

interface CodeSnippetProps {
  /** Code to display */
  code: string;
  /** Copy button label */
  copyLabel: string;
  /** Copied feedback label */
  copiedLabel: string;
  /** Copy failed label */
  failedLabel: string;
  className?: string;
}

export const CodeSnippet = ({
  code,
  copyLabel,
  copiedLabel,
  failedLabel,
  className,
}: CodeSnippetProps) => {
  const { copied, handleCopy } = useCopyToClipboard(code, {
    copiedLabel,
    failedLabel,
  });

  return (
    <div
      className={cn(
        'bg-terminal-bg border-terminal-border text-terminal-text relative rounded-lg border font-mono text-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words">
          <code>{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="text-terminal-muted hover:text-terminal-text hover:bg-terminal-border size-8 shrink-0"
          aria-label={copied ? copiedLabel : copyLabel}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
};
