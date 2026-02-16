'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { WidgetProps } from '@/types';
import { quickStartSteps } from './data/steps';
import { CodeSnippet } from './ui/CodeSnippet';

export const QuickStart = ({ locale }: WidgetProps) => {
  const t = useTranslations('quickStart');

  return (
    <section
      id="quick-start"
      data-testid="quick-start"
      lang={locale}
      aria-labelledby="quick-start-heading"
      className="mx-auto w-full max-w-4xl px-4 py-16"
    >
      <div className="mb-8 text-center">
        <h2
          id="quick-start-heading"
          className="text-3xl font-bold tracking-tight"
        >
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <Accordion type="single" collapsible defaultValue="step-1">
        {quickStartSteps.map(step => (
          <AccordionItem key={step.step} value={`step-${step.step}`}>
            <AccordionTrigger className="text-base font-medium">
              <span className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {step.step}
                </span>
                {t(step.title)}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pl-8">
                <p className="text-muted-foreground mb-3 text-sm">
                  {t(`${step.title}Desc`)}
                </p>
                <CodeSnippet
                  code={step.code}
                  copyLabel={t('copy')}
                  copiedLabel={t('copied')}
                  failedLabel={t('copyFailed')}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
