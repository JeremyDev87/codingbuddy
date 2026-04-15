import { WorkflowDemo } from '@/widgets/WorkflowDemo';
import type { SlotProps } from '@/types';

const WorkflowDemoSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <WorkflowDemo locale={locale} />;
};

export default WorkflowDemoSlot;
