'use client';

import { SlotError } from '@/components/SlotError';

interface FeaturesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const FeaturesError = ({ reset }: FeaturesErrorProps) => (
  <SlotError reset={reset} slotName="features" />
);

export default FeaturesError;
