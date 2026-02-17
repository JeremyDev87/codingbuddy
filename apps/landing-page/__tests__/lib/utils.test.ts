import { describe, test, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn utility function', () => {
  test('handles single class string', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  test('merges multiple class strings', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  test('ignores falsy values', () => {
    expect(cn('text-red-500', false, 'bg-blue-500', null, undefined)).toBe(
      'text-red-500 bg-blue-500',
    );
  });

  test('resolves Tailwind conflicts with last value winning', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    expect(cn('m-4', 'm-0')).toBe('m-0');
  });

  test('handles empty or no arguments', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });

  test('handles object syntax from clsx', () => {
    expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe('text-red-500');
  });

  test('handles array syntax from clsx', () => {
    expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500');
  });

  test('handles mixed types', () => {
    expect(cn('text-red-500', { 'bg-blue-500': true, hidden: false }, ['p-4', null])).toBe(
      'text-red-500 bg-blue-500 p-4',
    );
  });
});
