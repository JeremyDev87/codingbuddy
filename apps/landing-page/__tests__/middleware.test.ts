import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-intl middleware
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => {
    return (request: NextRequest) => {
      return NextResponse.next({
        request: { headers: new Headers(request.headers) },
      });
    };
  }),
}));

vi.mock('./i18n/routing', () => ({
  routing: { locales: ['en', 'ko'], defaultLocale: 'en' },
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const createRequest = (path = '/en') => new NextRequest(new URL(path, 'http://localhost:3000'));

  it('should set x-nonce request header', async () => {
    const { default: middleware } = await import('@/middleware');
    const request = createRequest();
    const response = await middleware(request);

    const nonce = response.headers.get('x-nonce');
    expect(nonce).toBeTruthy();
    expect(typeof nonce).toBe('string');
    expect(nonce!.length).toBeGreaterThan(0);
  });

  it('should set Content-Security-Policy response header with nonce', async () => {
    const { default: middleware } = await import('@/middleware');
    const request = createRequest();
    const response = await middleware(request);

    const csp = response.headers.get('Content-Security-Policy');
    const nonce = response.headers.get('x-nonce');

    expect(csp).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it('should not include unsafe-inline in script-src of CSP', async () => {
    const { default: middleware } = await import('@/middleware');
    const request = createRequest();
    const response = await middleware(request);

    const csp = response.headers.get('Content-Security-Policy');
    const scriptSrc = csp!.split('; ').find(d => d.startsWith('script-src'));

    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('should generate unique nonce per request', async () => {
    const { default: middleware } = await import('@/middleware');

    const response1 = await middleware(createRequest());
    const response2 = await middleware(createRequest());

    const nonce1 = response1.headers.get('x-nonce');
    const nonce2 = response2.headers.get('x-nonce');

    expect(nonce1).not.toBe(nonce2);
  });

  it('should export config with matcher', async () => {
    const { config } = await import('@/middleware');
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
  });
});
