import { vi } from 'vitest';

/**
 * Shared mock for @/i18n/navigation module.
 * Import this file in test files that render components using i18n navigation.
 *
 * Usage:
 *   import { mockReplace } from '@/__tests__/__helpers__/navigation-mock';
 *
 * The mockReplace spy is exported so tests can assert on router.replace calls.
 */
export const mockReplace = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/',
}));
