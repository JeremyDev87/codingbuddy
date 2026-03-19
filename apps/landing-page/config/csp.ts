type Environment = 'development' | 'production' | 'test';

export const buildCspHeader = (nonce: string, env: Environment = 'production'): string => {
  const isDev = env === 'development';

  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};
