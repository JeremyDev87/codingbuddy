import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // @ts-expect-error - vite version mismatch between vitest and @vitejs/plugin-react
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'widgets/**/*.{ts,tsx}',
        'app/**/*.{ts,tsx}',
        'hooks/**/*.ts',
        'lib/**/*.ts',
        'components/**/*.{ts,tsx}',
        'sections/**/*.{ts,tsx}',
        'i18n/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        'components/ui/**',
        '**/*.config.{ts,js}',
        '**/layout.tsx',
        'middleware.ts',
        'i18n.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
