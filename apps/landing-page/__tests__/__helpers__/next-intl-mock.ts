import { vi } from 'vitest';

/**
 * Shared mock for next-intl useTranslations hook.
 * Import this file in test files that render components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-mock';
 */
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      title: 'AI Specialist Agents',
      subtitle: '29 specialized AI agents',
      filter: 'Filter by category',
      search: 'Search agents...',
      allCategories: 'All Categories',
      noResults: 'No agents found matching your criteria',
      'categories.Planning': 'Planning',
      'categories.Development': 'Development',
      'categories.Review': 'Review',
      'categories.Security': 'Security',
      'categories.UX': 'UX',
    };
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === 'count') return `${params?.count} agents`;
      return translations[key] ?? key;
    };
    return t;
  },
}));
