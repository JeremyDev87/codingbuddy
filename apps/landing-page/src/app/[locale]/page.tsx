import type { SlotProps } from '@/types';
import { Hero } from '@/sections/Hero';
import { Problem } from '@/sections/Problem';
import { Solution } from '@/sections/Solution';
import { FAQ } from '@/sections/FAQ';

const LocalePage = async ({ params }: SlotProps) => {
  const { locale } = await params;

  return (
    <>
      <Hero locale={locale} />
      <Problem locale={locale} />
      <Solution locale={locale} />
      <FAQ locale={locale} />
    </>
  );
};

export default LocalePage;
