import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config';

describe('CSP Headers', () => {
  it('should include Vercel Analytics domains in CSP', async () => {
    const headers = await nextConfig.headers!();
    const globalHeaders = headers[0].headers;
    const cspHeader = globalHeaders.find(
      h => h.key === 'Content-Security-Policy',
    );

    expect(cspHeader).toBeDefined();
    const cspValue = cspHeader!.value;

    // script-src must allow Vercel Analytics script loading
    expect(cspValue).toContain('va.vercel-scripts.com');
    // connect-src must allow analytics data reporting
    expect(cspValue).toContain('vitals.vercel-insights.com');
  });

  it('should have restrictive defaults', async () => {
    const headers = await nextConfig.headers!();
    const cspHeader = headers[0].headers.find(
      h => h.key === 'Content-Security-Policy',
    );
    const cspValue = cspHeader!.value;

    expect(cspValue).toContain("default-src 'self'");
    expect(cspValue).toContain("frame-ancestors 'none'");
    expect(cspValue).toContain("base-uri 'self'");
    expect(cspValue).toContain("form-action 'self'");
  });
});
