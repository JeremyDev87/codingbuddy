'use client';

import type { AgentCategory } from '@/types';

const CATEGORIES: AgentCategory[] = ['Planning', 'Development', 'Review', 'Security', 'UX'];

interface FilterBarProps {
  category: AgentCategory | 'all';
  onCategoryChange: (value: AgentCategory | 'all') => void;
  translations: {
    filter: string;
    allCategories: string;
    categories: Record<AgentCategory, string>;
  };
}

export const FilterBar = ({ category, onCategoryChange, translations: t }: FilterBarProps) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label={t.filter}>
    <button
      type="button"
      onClick={() => onCategoryChange('all')}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        category === 'all'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      aria-pressed={category === 'all'}
    >
      {t.allCategories}
    </button>
    {CATEGORIES.map(cat => (
      <button
        key={cat}
        type="button"
        onClick={() => onCategoryChange(cat)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          category === cat
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
        aria-pressed={category === cat}
      >
        {t.categories[cat]}
      </button>
    ))}
  </div>
);
