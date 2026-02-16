'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  /** 복사할 텍스트 */
  code: string;
  /** 복사 버튼 라벨 */
  copyLabel: string;
  /** 복사 완료 라벨 */
  copiedLabel: string;
  /** 복사 실패 라벨 */
  failedLabel?: string;
  className?: string;
}

export const CopyButton = ({
  code,
  copyLabel,
  copiedLabel,
  failedLabel = 'Copy failed',
  className,
}: CopyButtonProps) => {
  const { copied, handleCopy } = useCopyToClipboard(code, {
    copiedLabel,
    failedLabel,
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn('h-8 gap-1.5 text-xs', className)}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span>{copied ? copiedLabel : copyLabel}</span>
    </Button>
  );
};
