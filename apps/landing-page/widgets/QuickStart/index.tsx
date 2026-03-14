'use client';

import { useTranslations } from 'next-intl';
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
        <h2 id="quick-start-heading" className="text-3xl font-bold tracking-tight">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <div className="relative flex flex-col" data-testid="step-flow">
        {quickStartSteps.map((step, index) => {
          const isLast = index === quickStartSteps.length - 1;

          return (
            <div key={step.step} className="relative flex gap-4" data-testid={`step-${step.step}`}>
              {/* Vertical connector line + step badge */}
              <div className="flex flex-col items-center">
                <span className="bg-primary text-primary-foreground z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {step.step}
                </span>
                {!isLast && (
                  <div
                    className="bg-border w-px flex-1"
                    aria-hidden="true"
                    data-testid="step-connector"
                  />
                )}
              </div>

              {/* Step content */}
              <div className={isLast ? 'min-w-0 flex-1' : 'min-w-0 flex-1 pb-8'}>
                <h3 className="text-lg font-semibold">{t(step.title)}</h3>
                <p className="text-muted-foreground mb-3 text-sm">{t(`${step.title}Desc`)}</p>
                <CodeSnippet
                  code={step.code}
                  copyLabel={t('copy')}
                  copiedLabel={t('copied')}
                  failedLabel={t('copied')}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
