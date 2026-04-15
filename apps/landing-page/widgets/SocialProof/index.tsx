import { getTranslations } from 'next-intl/server';
import { Bot, Wrench, CheckSquare, Globe, MonitorSmartphone } from 'lucide-react';
import type { WidgetProps } from '@/types';

const stats = [
  { key: 'agents', icon: Bot },
  { key: 'tools', icon: MonitorSmartphone },
  { key: 'skills', icon: Wrench },
  { key: 'checklists', icon: CheckSquare },
  { key: 'languages', icon: Globe },
] as const;

export const SocialProof = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'socialProof' });

  return (
    <section
      data-testid="social-proof"
      lang={locale}
      aria-label="Project statistics"
      className="border-y border-terminal-border/50 bg-terminal-bg/50 px-4 py-8"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 sm:gap-10">
        {stats.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon className="size-4 text-terminal-green" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold text-foreground">{t(key)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
