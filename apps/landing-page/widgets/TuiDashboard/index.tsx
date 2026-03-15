import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Activity, GitBranch, CheckSquare, BarChart3 } from 'lucide-react';
import type { WidgetProps } from '@/types';

const features = [
  { key: 'feature1', icon: GitBranch },
  { key: 'feature2', icon: Activity },
  { key: 'feature3', icon: CheckSquare },
  { key: 'feature4', icon: BarChart3 },
] as const;

export const TuiDashboard = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'tuiDashboard' });

  return (
    <section
      id="tui-dashboard"
      data-testid="tui-dashboard"
      lang={locale}
      aria-labelledby="tui-dashboard-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="tui-dashboard-heading"
          className="mb-3 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>

        <div className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-bg shadow-lg shadow-terminal-purple/5">
          <div className="flex items-center gap-2 border-b border-terminal-border px-4 py-2.5">
            <span className="size-3 rounded-full bg-terminal-red" aria-hidden="true" />
            <span className="size-3 rounded-full bg-terminal-yellow" aria-hidden="true" />
            <span className="size-3 rounded-full bg-terminal-green" aria-hidden="true" />
            <span className="ml-2 font-mono text-xs text-terminal-muted">
              codingbuddy agent dashboard
            </span>
          </div>
          <div className="relative aspect-[16/9] w-full">
            <Image
              src="/images/tui-dashboard.jpeg"
              alt={t('screenshotAlt')}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
              priority={false}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group rounded-lg border border-terminal-border bg-terminal-bg p-4 transition-all hover:border-terminal-green/50 hover:shadow-lg hover:shadow-terminal-green/5"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon
                  className="size-5 text-terminal-green transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
                <h3 className="font-mono text-sm font-semibold text-foreground">
                  {t(`${key}Title`)}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">{t(`${key}Desc`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-bg px-4 py-2.5 font-mono text-sm">
            <span className="text-terminal-green" aria-hidden="true">
              $
            </span>
            <code className="text-terminal-text">{t('command')}</code>
          </div>
          <span className="text-xs text-terminal-muted">{t('commandLabel')}</span>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-terminal-muted">
          {t('multiSession')}
        </p>
      </div>
    </section>
  );
};
