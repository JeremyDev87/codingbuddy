import { AgentsShowcase } from '@/widgets/AgentsShowcase';
import type { SlotProps } from '@/types';

const AgentsSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <AgentsShowcase locale={locale} />;
};

export default AgentsSlot;
