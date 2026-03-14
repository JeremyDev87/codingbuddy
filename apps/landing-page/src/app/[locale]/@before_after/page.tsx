import { BeforeAfter } from '@/widgets/BeforeAfter';
import type { SlotProps } from '@/types';

const BeforeAfterSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <BeforeAfter locale={locale} />;
};

export default BeforeAfterSlot;
