import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config';

describe('CSP Headers (next.config.ts)', () => {
  it('should NOT include static CSP header (handled by middleware)', async () => {
    const headers = await nextConfig.headers!();
    const globalHeaders = headers[0].headers;
    const cspHeader = globalHeaders.find(h => h.key === 'Content-Security-Policy');

    expect(cspHeader).toBeUndefined();
  });

  it('should still include other security headers', async () => {
    const headers = await nextConfig.headers!();
    const globalHeaders = headers[0].headers;
    const headerKeys = globalHeaders.map(h => h.key);

    expect(headerKeys).toContain('X-Frame-Options');
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('Referrer-Policy');
    expect(headerKeys).toContain('Permissions-Policy');
    expect(headerKeys).toContain('Strict-Transport-Security');
  });
});
