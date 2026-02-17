'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CodeExampleProps } from '@/types';
import { codeExamples } from './data/examples';
import { CodeBlock } from './ui/CodeBlock';

export const CodeExample = ({ locale }: CodeExampleProps) => {
  const t = useTranslations('codeExample');

  return (
    <section
      data-testid="code-example"
      lang={locale}
      aria-labelledby="code-example-heading"
      className="mx-auto w-full max-w-4xl px-4 py-16"
    >
      <div className="mb-8 text-center">
        <h2 id="code-example-heading" className="text-3xl font-bold tracking-tight">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col gap-8">
        {codeExamples.map(example => (
          <Tabs key={example.id} defaultValue="before">
            <TabsList className="w-full justify-start" aria-label={example.label}>
              <TabsTrigger value="before">{t('before')}</TabsTrigger>
              <TabsTrigger value="after">{t('after')}</TabsTrigger>
            </TabsList>
            <TabsContent value="before">
              <CodeBlock
                code={example.before}
                language={example.language}
                copyLabel={t('copy')}
                copiedLabel={t('copied')}
                failedLabel={t('copyFailed')}
              />
            </TabsContent>
            <TabsContent value="after">
              <CodeBlock
                code={example.after}
                language={example.language}
                copyLabel={t('copy')}
                copiedLabel={t('copied')}
                failedLabel={t('copyFailed')}
              />
            </TabsContent>
          </Tabs>
        ))}
      </div>
    </section>
  );
};
