import { getTranslations } from 'next-intl/server';
import { Heart, TrendingUp, Coins, Palette, BarChart3 } from 'lucide-react';
import type { WidgetProps } from '@/types';

const features = [
  { key: 'buddy', icon: Heart },
  { key: 'cost', icon: TrendingUp },
  { key: 'cache', icon: Coins },
  { key: 'mode', icon: Palette },
  { key: 'context', icon: BarChart3 },
] as const;

export const HudShowcase = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'hudShowcase' });

  return (
    <section
      data-testid="hud-showcase"
      lang={locale}
      aria-labelledby="hud-showcase-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="hud-showcase-heading"
          className="mb-3 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>

        {/* HUD Preview - Terminal style */}
        <div className="mx-auto mb-10 max-w-3xl overflow-hidden rounded-lg border border-terminal-border bg-terminal-bg shadow-lg glow-purple">
          <div className="flex items-center gap-2 border-b border-terminal-border px-4 py-2.5">
            <span className="size-3 rounded-full bg-terminal-red" aria-hidden="true" />
            <span className="size-3 rounded-full bg-terminal-yellow" aria-hidden="true" />
            <span className="size-3 rounded-full bg-terminal-green" aria-hidden="true" />
            <span className="ml-2 font-mono text-xs text-terminal-muted">
              codingbuddy HUD statusbar
            </span>
          </div>
          <div className="p-4">
            {/* Simulated HUD statusbar */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              {/* Buddy face */}
              <span className="inline-flex items-center gap-1 rounded bg-terminal-green/10 px-2 py-1 text-terminal-green">
                <span className="animate-pulse" aria-hidden="true">
                  (o_o)
                </span>
                <span>buddy</span>
              </span>
              {/* Mode */}
              <span className="inline-flex items-center gap-1 rounded bg-blue-400/10 px-2 py-1 text-blue-400">
                <span aria-hidden="true">◇</span>
                <span>PLAN</span>
              </span>
              {/* Cost velocity */}
              <span className="inline-flex items-center gap-1 rounded bg-terminal-yellow/10 px-2 py-1 text-terminal-yellow">
                <span aria-hidden="true">$1.23</span>
                <span>→$0.08/m</span>
              </span>
              {/* Cache savings */}
              <span className="inline-flex items-center gap-1 rounded bg-terminal-purple/10 px-2 py-1 text-terminal-purple">
                <span aria-hidden="true">💰</span>
                <span>$0.47 saved</span>
              </span>
              {/* Context bar */}
              <span className="inline-flex items-center gap-1 rounded bg-terminal-border/50 px-2 py-1 text-terminal-text">
                <span className="text-terminal-muted" aria-hidden="true">
                  [
                </span>
                <span className="inline-block h-1.5 w-12 rounded-full bg-terminal-border">
                  <span className="block h-full w-[42%] rounded-full bg-terminal-green" />
                </span>
                <span className="text-terminal-muted" aria-hidden="true">
                  42%]
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group rounded-lg border border-terminal-border bg-terminal-bg p-4 transition-all hover:border-terminal-purple/50 hover:shadow-lg hover:shadow-terminal-purple/5"
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
      </div>
    </section>
  );
};
