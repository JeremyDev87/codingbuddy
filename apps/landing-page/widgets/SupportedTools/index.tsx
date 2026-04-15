import { getTranslations } from 'next-intl/server';
import type { WidgetProps } from '@/types';

const tools = [
  { key: 'cursor', icon: '🖱️' },
  { key: 'claudeCode', icon: '🤖' },
  { key: 'codex', icon: '🐙' },
  { key: 'antigravity', icon: '💎' },
  { key: 'amazonQ', icon: '📦' },
  { key: 'kiro', icon: '⚡' },
  { key: 'windsurf', icon: '🏄' },
  { key: 'aider', icon: '🔨' },
  { key: 'opencode', icon: '🔓' },
] as const;

export const SupportedTools = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'supportedTools' });

  return (
    <section
      data-testid="supported-tools"
      lang={locale}
      aria-labelledby="supported-tools-heading"
      className="px-4 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2
          id="supported-tools-heading"
          className="mb-8 font-mono text-lg font-medium text-muted-foreground"
        >
          {t('title')}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {tools.map(({ key, icon }) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-bg px-4 py-2.5 font-mono text-sm text-terminal-text transition-colors hover:border-terminal-green/50 hover:text-terminal-green"
            >
              <span aria-hidden="true">{icon}</span>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-xs text-terminal-muted">{t('plus')}</p>
      </div>
    </section>
  );
};
