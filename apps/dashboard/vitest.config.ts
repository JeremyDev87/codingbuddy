import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // @ts-expect-error - vite version mismatch between vitest and @vitejs/plugin-react
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        '**/node_modules/**',
        '**/*.config.{ts,js}',
        'src/app/layout.tsx',
      ],
    },
  },
});
