import { getTranslations } from 'next-intl/server';
import { X, Check } from 'lucide-react';
import type { WidgetProps } from '@/types';

const beforeFiles = [
  'cursorrules',
  'claudeMd',
  'codexRules',
  'antigravityRules',
  'qRules',
  'kiroRules',
] as const;

export const BeforeAfter = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'beforeAfter' });

  return (
    <section
      data-testid="before-after"
      lang={locale}
      aria-labelledby="before-after-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="before-after-heading"
          className="mb-12 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Before */}
          <div className="rounded-lg border border-terminal-red/30 bg-terminal-bg p-5">
            <div className="mb-4 flex items-center gap-2">
              <X className="size-4 text-terminal-red" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-red">
                {t('beforeLabel')}
              </span>
            </div>
            <div className="space-y-2">
              {beforeFiles.map(key => (
                <div
                  key={key}
                  className="flex items-center gap-2 font-mono text-sm text-terminal-text"
                >
                  <span className="text-terminal-muted" aria-hidden="true">
                    📄
                  </span>
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-terminal-red/80">{t('beforeFiles')}</p>
          </div>

          {/* After */}
          <div className="rounded-lg border border-terminal-green/30 bg-terminal-bg p-5">
            <div className="mb-4 flex items-center gap-2">
              <Check className="size-4 text-terminal-green" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-green">
                {t('afterLabel')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-sm text-terminal-green">
                <span className="text-terminal-muted" aria-hidden="true">
                  📁
                </span>
                <span className="font-semibold">{t('singleSource')}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-terminal-green/80">
                <Check className="size-3" aria-hidden="true" />
                <span>{t('autoSynced')}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-terminal-green/80">
                <Check className="size-3" aria-hidden="true" />
                <span>{t('alwaysCurrent')}</span>
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-terminal-green/80">{t('afterFiles')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
