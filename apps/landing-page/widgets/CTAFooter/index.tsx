import { connection } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { Github, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '@/types';

export const CTAFooter = async ({ locale }: WidgetProps) => {
  await connection();
  const t = await getTranslations({ locale, namespace: 'ctaFooter' });
  const year = new Date().getFullYear();

  return (
    <>
      {/* CTA Section */}
      <section
        data-testid="cta"
        lang={locale}
        aria-labelledby="cta-heading"
        className="px-4 py-16 sm:py-24 text-center"
      >
        <div className="mx-auto max-w-2xl">
          <h2 id="cta-heading" className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            {t('title')}
          </h2>

          <div className="mt-8 mx-auto max-w-md rounded-lg border border-terminal-border bg-terminal-bg p-4">
            <code className="font-mono text-sm text-terminal-green">$ {t('command')}</code>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="font-mono bg-terminal-green hover:bg-terminal-green/90 text-black"
              asChild
            >
              <a
                href="https://github.com/JeremyDev87/codingbuddy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" aria-hidden="true" />
                {t('github')}
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="font-mono border-terminal-border hover:border-terminal-purple"
              asChild
            >
              <a
                href="https://github.com/JeremyDev87/codingbuddy#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                {t('docs')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        data-testid="footer"
        aria-label="Site footer"
        className="border-t border-border px-4 py-6"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 text-center sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">
            {t('copyright', { year: String(year) })}
          </p>
          <p className="font-mono text-xs text-terminal-muted">{t('madeWith')}</p>
        </div>
      </footer>
    </>
  );
};
