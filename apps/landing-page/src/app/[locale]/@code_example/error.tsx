'use client';

import { SlotError } from '@/components/SlotError';

interface CodeExampleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const CodeExampleError = ({ reset }: CodeExampleErrorProps) => (
  <SlotError reset={reset} slotName="code example" />
);

export default CodeExampleError;
