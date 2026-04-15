'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Code, GitBranch, Eye, Brain, Wrench } from 'lucide-react';
import type { WidgetProps } from '@/types';

const categories = [
  { key: 'development', icon: Code },
  { key: 'teamGit', icon: GitBranch },
  { key: 'review', icon: Eye },
  { key: 'intelligence', icon: Brain },
  { key: 'specialized', icon: Wrench },
] as const;

export const SkillsLibrary = ({ locale }: WidgetProps) => {
  const t = useTranslations('skillsLibrary');
  const [activeCategory, setActiveCategory] = useState<number>(0);

  return (
    <section
      data-testid="skills-library"
      lang={locale}
      aria-labelledby="skills-library-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="skills-library-heading"
          className="mb-3 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('title')}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>

        {/* Category tabs */}
        <div
          className="mb-6 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Skill categories"
        >
          {categories.map(({ key, icon: Icon }, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeCategory === index}
              aria-controls={`skills-panel-${key}`}
              onClick={() => setActiveCategory(index)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm transition-all ${
                activeCategory === index
                  ? 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green'
                  : 'border-terminal-border text-terminal-muted hover:border-terminal-border/80 hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(key)}
            </button>
          ))}
        </div>

        {/* Skills panel */}
        <div
          id={`skills-panel-${categories[activeCategory].key}`}
          role="tabpanel"
          className="rounded-lg border border-terminal-border bg-terminal-bg p-6"
        >
          <div className="flex flex-wrap gap-2">
            {t(`${categories[activeCategory].key}Skills`)
              .split(', ')
              .map(skill => (
                <span
                  key={skill}
                  className="rounded-md border border-terminal-border/50 bg-terminal-bg px-3 py-1.5 font-mono text-xs text-terminal-text transition-colors hover:border-terminal-green/50 hover:text-terminal-green"
                >
                  {skill}
                </span>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};
