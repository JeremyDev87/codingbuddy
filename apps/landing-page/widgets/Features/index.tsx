import { getTranslations } from 'next-intl/server';
import { RefreshCw, Bot, ClipboardList, TestTube, Globe, Zap } from 'lucide-react';
import type { WidgetProps } from '@/types';

const features = [
  { key: 'universalRules', icon: RefreshCw },
  { key: 'agents', icon: Bot },
  { key: 'workflow', icon: ClipboardList },
  { key: 'quality', icon: TestTube },
  { key: 'mcp', icon: Globe },
  { key: 'zeroConfig', icon: Zap },
] as const;

export const Features = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'features' });

  return (
    <section
      id="features"
      data-testid="features"
      lang={locale}
      aria-labelledby="features-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="features-heading"
          className="mb-12 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group rounded-lg border border-terminal-border bg-terminal-bg p-5 transition-all hover:border-terminal-purple/50 hover:shadow-lg hover:shadow-terminal-purple/5"
            >
              <div className="mb-3 text-terminal-green transition-transform group-hover:scale-110">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h3 className="font-mono text-sm font-semibold text-foreground">
                {t(`${key}Title`)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`${key}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
