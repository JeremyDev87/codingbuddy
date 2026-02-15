'use client';

import { SlotError } from '@/components/SlotError';

interface QuickStartErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const QuickStartError = ({ reset }: QuickStartErrorProps) => (
  <SlotError reset={reset} slotName="quick start" />
);

export default QuickStartError;
