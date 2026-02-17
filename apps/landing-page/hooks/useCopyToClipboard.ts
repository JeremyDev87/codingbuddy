'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';

const COPY_FEEDBACK_DURATION_MS = 2000;

interface UseCopyToClipboardOptions {
  copiedLabel: string;
  failedLabel: string;
}

export const useCopyToClipboard = (
  code: string,
  { copiedLabel, failedLabel }: UseCopyToClipboardOptions,
) => {
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
      timerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } else {
      toast.error(failedLabel);
    }
  };

  return { copied, handleCopy };
};
