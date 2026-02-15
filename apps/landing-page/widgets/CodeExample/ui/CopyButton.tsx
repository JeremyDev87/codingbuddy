'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '../lib/copyToClipboard';

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
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      clearTimeout(timerRef.current);
      setCopied(true);
      toast.success(copiedLabel);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(failedLabel);
    }
  };

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
