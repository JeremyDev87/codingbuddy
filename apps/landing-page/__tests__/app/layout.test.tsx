import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
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

  it('should render Analytics and SpeedInsights components', async () => {
    const { default: RootLayout } = await import('@/src/app/layout');
    const { container } = render(
      <RootLayout>
        <main>Test</main>
      </RootLayout>,
    );

    expect(
      container.querySelector('[data-testid="vercel-analytics"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="vercel-speed-insights"]'),
    ).not.toBeNull();
  });
});
