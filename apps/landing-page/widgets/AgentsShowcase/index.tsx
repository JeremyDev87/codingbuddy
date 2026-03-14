'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AgentCategory, WidgetProps } from '@/types';
import { agents } from './data/agents';
import { useAgentFilter } from './hooks/useAgentFilter';
import { AgentCard } from './ui/AgentCard';
import { FilterBar } from './ui/FilterBar';

const MAX_VISIBLE_AGENTS = 8;

export const AgentsShowcase = ({ locale }: WidgetProps) => {
  const t = useTranslations('agents');

  const { filteredAgents, category, setCategory } = useAgentFilter(agents);

  const translations = {
    filter: t('filter'),
    allCategories: t('allCategories'),
    categories: {
      Planning: t('categories.Planning'),
      Development: t('categories.Development'),
      Review: t('categories.Review'),
      Security: t('categories.Security'),
      UX: t('categories.UX'),
    } as Record<AgentCategory, string>,
  };

  const visibleAgents = filteredAgents.slice(0, MAX_VISIBLE_AGENTS);
  const hasMore = filteredAgents.length > MAX_VISIBLE_AGENTS;

  return (
    <section
      id="agents"
      data-testid="agents-showcase"
      lang={locale}
      aria-labelledby="agents-heading"
      className="mx-auto w-full max-w-6xl px-4 py-16"
    >
      <div className="mb-8 text-center">
        <h2 id="agents-heading" className="text-3xl font-bold tracking-tight">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <div className="mb-6">
        <FilterBar category={category} onCategoryChange={setCategory} translations={translations} />
      </div>

      <p className="text-muted-foreground mb-4 text-sm" aria-live="polite">
        {t('count', { count: filteredAgents.length })}
      </p>

      {visibleAgents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              translatedCategory={translations.categories[agent.category]}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center" role="status">
          {t('noResults')}
        </p>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <a
            href="#agents-all"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            {t('viewAll')}
            <ArrowRight className="size-4" />
          </a>
        </div>
      )}
    </section>
  );
};
