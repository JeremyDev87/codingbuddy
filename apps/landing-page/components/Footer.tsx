import { connection } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { Github } from 'lucide-react';
import type { WidgetProps } from '@/types';

export const Footer = async ({ locale }: WidgetProps) => {
  await connection();
  const t = await getTranslations({ locale, namespace: 'footer' });
  const year = new Date().getFullYear();

  return (
    <footer aria-label={t('label')} className="border-t border-border bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">{t('copyright', { year: String(year) })}</p>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{t('license')}</span>
          <a
            href="https://github.com/JeremyDev87/codingbuddy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`${t('github')} - Codingbuddy`}
          >
            <Github className="size-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
};
