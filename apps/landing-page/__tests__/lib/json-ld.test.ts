import { describe, test, expect } from 'vitest';
import { generateJsonLd } from '@/lib/json-ld';

describe('generateJsonLd', () => {
  test('returns valid SoftwareApplication schema', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
      description: 'One ruleset for all tools.',
      locale: 'en',
    });

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
      description: 'One ruleset for all tools.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      inLanguage: 'en',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    });
  });

  test('sets inLanguage based on locale parameter', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy',
      description: 'desc',
      locale: 'ko',
    });

    expect(result.inLanguage).toBe('ko');
  });

  test('handles zh-CN locale', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy',
      description: 'desc',
      locale: 'zh-CN',
    });

    expect(result.inLanguage).toBe('zh-CN');
  });
});
