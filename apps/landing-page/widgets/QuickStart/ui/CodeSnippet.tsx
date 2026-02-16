'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

interface CodeSnippetProps {
  /** 표시할 코드 */
  code: string;
  /** 복사 버튼 라벨 */
  copyLabel: string;
  /** 복사 완료 라벨 */
  copiedLabel: string;
  /** 복사 실패 라벨 */
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
        'bg-muted/50 relative rounded-md border font-mono text-sm',
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
          className="size-8 shrink-0"
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
