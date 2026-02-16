import { vi } from 'vitest';
import { createMockT } from './mock-translations';

/**
 * Shared mock for next-intl useTranslations hook.
 * Import this file in test files that render components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-mock';
 */
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace?: string) => createMockT(namespace),
}));
