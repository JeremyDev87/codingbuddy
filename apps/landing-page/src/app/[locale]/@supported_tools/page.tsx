import { SupportedTools } from '@/widgets/SupportedTools';
import type { SlotProps } from '@/types';

const SupportedToolsSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <SupportedTools locale={locale} />;
};

export default SupportedToolsSlot;
