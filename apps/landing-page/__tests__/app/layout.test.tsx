import { describe, it, expect } from 'vitest';

describe('RootLayout', () => {
  it('should export a default layout component', async () => {
    const layoutModule = await import('@/src/app/layout');
    expect(layoutModule.default).toBeDefined();
    expect(typeof layoutModule.default).toBe('function');
  });

  it('should return children as-is (pass-through)', async () => {
    const layoutModule = await import('@/src/app/layout');
    const Layout = layoutModule.default;
    const children = '<div>test</div>';
    const result = Layout({ children });
    expect(result).toBe(children);
  });

  it('should export metadata with correct title', async () => {
    const layoutModule = await import('@/src/app/layout');
    expect(layoutModule.metadata).toBeDefined();
    expect(layoutModule.metadata.title).toContain('Codingbuddy');
  });
});
