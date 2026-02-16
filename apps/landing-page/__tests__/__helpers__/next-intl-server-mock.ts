import { vi } from 'vitest';
import { createMockT } from './mock-translations';

/**
 * Shared mock for next-intl/server getTranslations.
 * Import this file in test files that render async server components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-server-mock';
 */
vi.mock('next-intl/server', () => ({
  getTranslations: async ({
    namespace,
  }: {
    locale: string;
    namespace: string;
  }) => createMockT(namespace),
  setRequestLocale: () => {},
  getMessages: async () => ({}),
}));
