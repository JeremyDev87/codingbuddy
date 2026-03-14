'use client';

import { SlotError } from '@/components/SlotError';

interface CTAFooterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const CTAFooterError = ({ reset }: CTAFooterErrorProps) => (
  <SlotError reset={reset} slotName="footer" />
);

export default CTAFooterError;
