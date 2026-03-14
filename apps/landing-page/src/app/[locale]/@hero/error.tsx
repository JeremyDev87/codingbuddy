'use client';

import { SlotError } from '@/components/SlotError';

interface HeroErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const HeroError = ({ reset }: HeroErrorProps) => <SlotError reset={reset} slotName="hero" />;

export default HeroError;
