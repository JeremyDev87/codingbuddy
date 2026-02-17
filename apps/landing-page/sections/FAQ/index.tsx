import { getTranslations } from 'next-intl/server';
import { FAQAccordion } from './FAQAccordion';
import type { WidgetProps } from '@/types';

export const FAQ = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'faq' });

  return (
    <section
      id="faq"
      data-testid="faq"
      lang={locale}
      aria-labelledby="faq-heading"
      className="bg-muted/50 px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{t('subtitle')}</p>
        </div>

        <FAQAccordion />
      </div>
    </section>
  );
};
