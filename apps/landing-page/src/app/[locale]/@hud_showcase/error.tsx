'use client';

import { SlotError } from '@/components/SlotError';

interface HudShowcaseErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const HudShowcaseError = ({ reset }: HudShowcaseErrorProps) => (
  <SlotError reset={reset} slotName="hud-showcase" />
);

export default HudShowcaseError;
