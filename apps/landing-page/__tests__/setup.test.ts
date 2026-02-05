import { describe, test, expect } from 'vitest';
import pkg from '../package.json';
import tsconfig from '../tsconfig.json';

describe('Next.js 16 Project Setup', () => {
  test('project has correct name', () => {
    expect(pkg.name).toBe('landing-page');
  });

  test('Next.js 16.x is installed and locked', () => {
    expect(pkg.dependencies.next).toBe('16.1.6');
  });

  test('React 19.x is installed and locked', () => {
    expect(pkg.dependencies.react).toBe('19.2.3');
    expect(pkg.dependencies['react-dom']).toBe('19.2.3');
  });

  test('TypeScript is configured in strict mode', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
  });

  test('TypeScript target is ES2022', () => {
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
  });

  test('TypeScript uses bundler module resolution', () => {
    expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
  });

  test('path aliases are configured', () => {
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/types');
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/widgets/*');
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/components/*');
  });
});
