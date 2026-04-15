import { HudShowcase } from '@/widgets/HudShowcase';
import type { SlotProps } from '@/types';

const HudShowcaseSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <HudShowcase locale={locale} />;
};

export default HudShowcaseSlot;
