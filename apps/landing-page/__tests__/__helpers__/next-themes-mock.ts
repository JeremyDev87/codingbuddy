import { vi } from 'vitest';

/**
 * Shared mock for next-themes useTheme hook.
 * Import this file in test files that render components using next-themes.
 *
 * Usage: import '@/__tests__/__helpers__/next-themes-mock';
 */
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'system',
    setTheme: vi.fn(),
    themes: ['light', 'dark', 'system'],
    resolvedTheme: 'light',
    systemTheme: 'light',
    forcedTheme: undefined,
  })),
}));
