'use client';

import { SlotError } from '@/components/SlotError';

interface SocialProofErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SocialProofError = ({ reset }: SocialProofErrorProps) => (
  <SlotError reset={reset} slotName="social-proof" />
);

export default SocialProofError;
