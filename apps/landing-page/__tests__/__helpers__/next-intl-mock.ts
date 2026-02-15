import { vi } from 'vitest';

/**
 * Shared mock for next-intl useTranslations hook.
 * Import this file in test files that render components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-mock';
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const allTranslations: Record<string, Record<string, string>> = {
      agents: {
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
      },
      codeExample: {
        title: 'See the Difference',
        subtitle:
          'One ruleset replaces scattered configs across all your AI tools',
        before: 'Before: Without Codingbuddy',
        after: 'After: With Codingbuddy',
        copy: 'Copy code',
        copied: 'Copied!',
        copyFailed: 'Copy failed',
      },
    };
    const translations = namespace ? (allTranslations[namespace] ?? {}) : {};
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === 'count') return `${params?.count} agents`;
      return translations[key] ?? key;
    };
    return t;
  },
}));
