'use client';

import { SlotError } from '@/components/SlotError';

interface TuiDashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const TuiDashboardError = ({ reset }: TuiDashboardErrorProps) => (
  <SlotError reset={reset} slotName="tui-dashboard" />
);

export default TuiDashboardError;
