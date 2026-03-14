'use client';

import { SlotError } from '@/components/SlotError';

interface SupportedToolsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SupportedToolsError = ({ reset }: SupportedToolsErrorProps) => (
  <SlotError reset={reset} slotName="supported tools" />
);

export default SupportedToolsError;
