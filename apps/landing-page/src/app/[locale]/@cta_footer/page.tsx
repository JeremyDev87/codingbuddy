import { CTAFooter } from '@/widgets/CTAFooter';
import type { SlotProps } from '@/types';

const CTAFooterSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <CTAFooter locale={locale} />;
};

export default CTAFooterSlot;
