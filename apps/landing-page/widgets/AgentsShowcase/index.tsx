'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AgentCategory, WidgetProps } from '@/types';
import { agents } from './data/agents';
import { useAgentFilter } from './hooks/useAgentFilter';
import { AgentCard } from './ui/AgentCard';
import { FilterBar } from './ui/FilterBar';

const MAX_VISIBLE_AGENTS = 8;
const AGENTS_ALL_HASH = '#agents-all';

const hashSubscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHashSnapshot = () => window.location.hash;
const getServerSnapshot = () => '';

export const AgentsShowcase = ({ locale }: WidgetProps) => {
  const t = useTranslations('agents');
  const hash = useSyncExternalStore(hashSubscribe, getHashSnapshot, getServerSnapshot);
  const showAllFromHash = hash === AGENTS_ALL_HASH;

  const { filteredAgents, category, setCategory } = useAgentFilter(agents);

  const handleViewAll = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.hash = AGENTS_ALL_HASH;
  }, []);

  const handleShowLess = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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

  const hasMore = filteredAgents.length > MAX_VISIBLE_AGENTS;
  const visibleAgents = showAllFromHash
    ? filteredAgents
    : filteredAgents.slice(0, MAX_VISIBLE_AGENTS);

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
        <div id="agents-all" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {hasMore && !showAllFromHash && (
        <div className="mt-8 text-center">
          <a
            href="#agents-all"
            onClick={handleViewAll}
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            {t('viewAll')}
            <ArrowRight className="size-4" />
          </a>
        </div>
      )}

      {showAllFromHash && hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleShowLess}
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            {t('showLess')}
            <ChevronUp className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
};
