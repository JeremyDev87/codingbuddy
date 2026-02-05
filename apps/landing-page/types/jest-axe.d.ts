declare module 'jest-axe' {
  import type { Result } from 'axe-core';

  export function axe(html: Element | Document, options?: any): Promise<Result>;

  export function toHaveNoViolations(received: Result): any;
}

// Extend Vitest Assertion types
import 'vitest';
import type { Result } from 'axe-core';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): any;
  }
}
