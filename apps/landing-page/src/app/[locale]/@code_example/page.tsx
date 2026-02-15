import { CodeExample } from '@/widgets/CodeExample';
import type { SlotProps } from '@/types';

const PLACEHOLDER_BEFORE =
  '// Without Codingbuddy\n// Each AI tool has different rules...';
const PLACEHOLDER_AFTER =
  '// With Codingbuddy\n// One ruleset for all AI tools!';

const CodeExampleSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return (
    <CodeExample
      locale={locale}
      beforeCode={PLACEHOLDER_BEFORE}
      afterCode={PLACEHOLDER_AFTER}
    />
  );
};

export default CodeExampleSlot;
