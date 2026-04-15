'use client';

import { SlotError } from '@/components/SlotError';

interface WorkflowDemoErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const WorkflowDemoError = ({ reset }: WorkflowDemoErrorProps) => (
  <SlotError reset={reset} slotName="workflow-demo" />
);

export default WorkflowDemoError;
