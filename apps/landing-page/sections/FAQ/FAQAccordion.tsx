'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqItems } from './data/questions';

export const FAQAccordion = () => {
  const t = useTranslations('faq');

  return (
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
  );
};
