'use client';

import { SlotError } from '@/components/SlotError';

interface SkillsLibraryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SkillsLibraryError = ({ reset }: SkillsLibraryErrorProps) => (
  <SlotError reset={reset} slotName="skills-library" />
);

export default SkillsLibraryError;
