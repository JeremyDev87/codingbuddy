'use client';

import { Search } from 'lucide-react';
import type { AgentCategory } from '@/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES: AgentCategory[] = [
  'Planning',
  'Development',
  'Review',
  'Security',
  'UX',
];

interface FilterBarProps {
  category: AgentCategory | 'all';
  onCategoryChange: (value: AgentCategory | 'all') => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  translations: {
    filter: string;
    search: string;
    allCategories: string;
    categories: Record<AgentCategory, string>;
  };
}

export const FilterBar = ({
  category,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  translations: t,
}: FilterBarProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
    <Select
      value={category}
      onValueChange={value => onCategoryChange(value as AgentCategory | 'all')}
    >
      <SelectTrigger className="w-full sm:w-[200px]" aria-label={t.filter}>
        <SelectValue placeholder={t.filter} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t.allCategories}</SelectItem>
        {CATEGORIES.map(cat => (
          <SelectItem key={cat} value={cat}>
            {t.categories[cat]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <div className="relative flex-1">
      <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        type="search"
        placeholder={t.search}
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        className="pl-9"
        aria-label={t.search}
      />
    </div>
  </div>
);
