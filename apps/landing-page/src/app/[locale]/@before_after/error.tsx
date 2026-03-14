'use client';

import { SlotError } from '@/components/SlotError';

interface BeforeAfterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const BeforeAfterError = ({ reset }: BeforeAfterErrorProps) => (
  <SlotError reset={reset} slotName="before after" />
);

export default BeforeAfterError;
