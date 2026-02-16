'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { WidgetProps } from '@/types';
import { faqItems } from './data/questions';

export const FAQ = ({ locale }: WidgetProps) => {
  const t = useTranslations('faq');

  return (
    <section
      data-testid="faq"
      lang={locale}
      aria-labelledby="faq-heading"
      className="bg-muted/50 px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{t('subtitle')}</p>
        </div>

        <Accordion type="single" collapsible defaultValue="q1">
          {faqItems.map(({ key }) => {
            const answerKey = key.replace('q', 'a');
            return (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {t(key)}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{t(answerKey)}</p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};
