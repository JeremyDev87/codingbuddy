import { SocialProof } from '@/widgets/SocialProof';
import type { SlotProps } from '@/types';

const SocialProofSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <SocialProof locale={locale} />;
};

export default SocialProofSlot;
