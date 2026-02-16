import { describe, it, expect, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
}));

vi.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

describe('RootLayout', () => {
  it('should export a default layout component', async () => {
    const layoutModule = await import('@/src/app/layout');
    expect(layoutModule.default).toBeDefined();
    expect(typeof layoutModule.default).toBe('function');
  });

  it('should export metadata with correct title', async () => {
    const layoutModule = await import('@/src/app/layout');
    expect(layoutModule.metadata).toBeDefined();
    expect(layoutModule.metadata.title).toContain('Codingbuddy');
  });
});
