import { SkillsLibrary } from '@/widgets/SkillsLibrary';
import type { SlotProps } from '@/types';

const SkillsLibrarySlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <SkillsLibrary locale={locale} />;
};

export default SkillsLibrarySlot;
