'use client';

import { SlotError } from '@/components/SlotError';

interface AgentsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const AgentsError = ({ reset }: AgentsErrorProps) => <SlotError reset={reset} slotName="agents" />;

export default AgentsError;
