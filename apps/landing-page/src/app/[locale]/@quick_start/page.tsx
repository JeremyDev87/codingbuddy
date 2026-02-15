import { QuickStart } from '@/widgets/QuickStart';
import type { SlotProps } from '@/types';

const QuickStartSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <QuickStart locale={locale} />;
};

export default QuickStartSlot;
