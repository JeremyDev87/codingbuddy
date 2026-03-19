import { describe, it, expect } from 'vitest';
import { buildCspHeader } from '@/config/csp';

describe('buildCspHeader', () => {
  const TEST_NONCE = 'test-nonce-abc123';

  it('should include nonce in script-src for production', () => {
    const csp = buildCspHeader(TEST_NONCE, 'production');
    const scriptSrc = csp.split('; ').find(d => d.startsWith('script-src'));

    expect(scriptSrc).toContain(`'nonce-${TEST_NONCE}'`);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('should include Vercel Analytics domain in script-src for production', () => {
    const csp = buildCspHeader(TEST_NONCE, 'production');

    expect(csp).toContain('https://va.vercel-scripts.com');
  });

  it('should include unsafe-eval in script-src for development', () => {
    const csp = buildCspHeader(TEST_NONCE, 'development');

    expect(csp).toContain("'unsafe-eval'");
  });

  it('should include nonce in script-src for development too', () => {
    const csp = buildCspHeader(TEST_NONCE, 'development');

    expect(csp).toContain(`'nonce-${TEST_NONCE}'`);
  });

  it('should have restrictive defaults', () => {
    const csp = buildCspHeader(TEST_NONCE, 'production');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('should allow analytics connect-src', () => {
    const csp = buildCspHeader(TEST_NONCE, 'production');

    expect(csp).toContain('https://va.vercel-scripts.com');
    expect(csp).toContain('https://vitals.vercel-insights.com');
  });

  it('should allow unsafe-inline in style-src', () => {
    const csp = buildCspHeader(TEST_NONCE, 'production');

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});
