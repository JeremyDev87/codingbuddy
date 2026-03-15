import { TuiDashboard } from '@/widgets/TuiDashboard';
import type { SlotProps } from '@/types';

const TuiDashboardSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <TuiDashboard locale={locale} />;
};

export default TuiDashboardSlot;
