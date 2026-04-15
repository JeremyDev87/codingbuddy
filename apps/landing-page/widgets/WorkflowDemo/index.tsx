'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileSearch, Code, Users, Infinity } from 'lucide-react';
import type { WidgetProps } from '@/types';

const modes = [
  {
    key: 'plan',
    icon: FileSearch,
    color: 'text-blue-400',
    border: 'border-blue-400/50',
    bg: 'bg-blue-400/10',
    glow: 'shadow-blue-400/10',
  },
  {
    key: 'act',
    icon: Code,
    color: 'text-terminal-green',
    border: 'border-terminal-green/50',
    bg: 'bg-terminal-green/10',
    glow: 'shadow-terminal-green/10',
  },
  {
    key: 'eval',
    icon: Users,
    color: 'text-terminal-purple',
    border: 'border-terminal-purple/50',
    bg: 'bg-terminal-purple/10',
    glow: 'shadow-terminal-purple/10',
  },
  {
    key: 'auto',
    icon: Infinity,
    color: 'text-terminal-yellow',
    border: 'border-terminal-yellow/50',
    bg: 'bg-terminal-yellow/10',
    glow: 'shadow-terminal-yellow/10',
  },
] as const;

export const WorkflowDemo = ({ locale }: WidgetProps) => {
  const t = useTranslations('workflowDemo');
  const [activeMode, setActiveMode] = useState<number>(0);
  const mode = modes[activeMode];

  return (
    <section
      data-testid="workflow-demo"
      lang={locale}
      aria-labelledby="workflow-demo-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="workflow-demo-heading"
          className="mb-3 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>

        {/* Mode tabs */}
        <div className="mb-8 flex justify-center gap-2" role="tablist" aria-label="Workflow modes">
          {modes.map(({ key, icon: Icon, color, border, bg }, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeMode === index}
              aria-controls={`panel-${key}`}
              onClick={() => setActiveMode(index)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm font-semibold transition-all ${
                activeMode === index
                  ? `${border} ${bg} ${color}`
                  : 'border-terminal-border text-terminal-muted hover:border-terminal-border/80 hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(`${key}Title`)}
            </button>
          ))}
        </div>

        {/* Mode content panel */}
        <div
          id={`panel-${modes[activeMode].key}`}
          role="tabpanel"
          className={`rounded-lg border ${mode.border} ${mode.bg} p-6 shadow-lg ${mode.glow} transition-all`}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className={`mb-4 text-sm sm:text-base ${mode.color}`}>
                {t(`${modes[activeMode].key}Desc`)}
              </p>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 font-mono text-xs ${mode.color}`} aria-hidden="true">
                    {activeMode === 3 ? '∞' : `0${i}`}
                  </span>
                  <span className="text-sm text-foreground">
                    {t(`${modes[activeMode].key}Detail${i}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow arrows */}
        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-sm text-terminal-muted">
          <span className="text-blue-400">PLAN</span>
          <span aria-hidden="true">→</span>
          <span className="text-terminal-green">ACT</span>
          <span aria-hidden="true">→</span>
          <span className="text-terminal-purple">EVAL</span>
          <span aria-hidden="true">→</span>
          <span className="text-terminal-yellow">AUTO</span>
        </div>
      </div>
    </section>
  );
};
