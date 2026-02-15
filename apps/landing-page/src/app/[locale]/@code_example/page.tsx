import { CodeExample } from '@/widgets/CodeExample';
import type { SlotProps } from '@/types';

const CodeExampleSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <CodeExample locale={locale} />;
};

export default CodeExampleSlot;
