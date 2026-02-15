import type { SlotProps } from '@/types';

const LocalePage = async ({ params }: SlotProps) => {
  const { locale } = await params;

  return (
    <section className="py-16 px-4 text-center" lang={locale}>
      <h1 className="text-4xl font-bold tracking-tight">Codingbuddy</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Multi-AI Rules for Consistent Coding
      </p>
    </section>
  );
};

export default LocalePage;
