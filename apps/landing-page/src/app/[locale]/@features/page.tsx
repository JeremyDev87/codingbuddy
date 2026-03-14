import { Features } from '@/widgets/Features';
import type { SlotProps } from '@/types';

const FeaturesSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <Features locale={locale} />;
};

export default FeaturesSlot;
