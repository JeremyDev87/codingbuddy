import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
