import { Hero } from '@/widgets/Hero';
import type { SlotProps } from '@/types';

const HeroSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <Hero locale={locale} />;
};

export default HeroSlot;
