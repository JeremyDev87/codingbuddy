import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { buildCspHeader } from './config/csp';

const intlMiddleware = createIntlMiddleware(routing);

const middleware = (request: NextRequest): NextResponse => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const env = process.env.NODE_ENV ?? 'production';
  const cspHeader = buildCspHeader(nonce, env as 'development' | 'production');

  // Set nonce on request headers for downstream consumption
  request.headers.set('x-nonce', nonce);

  const response = intlMiddleware(request) as NextResponse;

  // Set CSP and nonce on response headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);

  return response;
};

export default middleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|monitoring|.*\\..*).*)'],
};
