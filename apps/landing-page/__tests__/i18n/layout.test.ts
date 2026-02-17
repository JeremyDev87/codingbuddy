import { describe, test, expect, vi } from 'vitest';
import { SUPPORTED_LOCALES } from '../../lib/locale';
import { generateJsonLd } from '../../lib/json-ld';

// Mock font loaders moved from root layout to locale layout
vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
}));

// Mock navigation module used by Header (imported by layout)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: 'a',
    redirect: vi.fn(),
    usePathname: () => '/',
    useRouter: () => ({ replace: vi.fn() }),
  }),
}));

// Import generateStaticParams directly to test static generation
// Note: Full layout rendering requires Next.js server context (NextIntlClientProvider, getMessages)
// which cannot be tested in unit tests. This tests the exportable pure function.

describe('locale layout', () => {
  test('generateStaticParams produces all supported locales', async () => {
    const mod = await import('../../src/app/[locale]/layout');
    const { generateStaticParams } = mod;
    const params = generateStaticParams();

    expect(params).toHaveLength(SUPPORTED_LOCALES.length);
    for (const locale of SUPPORTED_LOCALES) {
      expect(params).toContainEqual({ locale });
    }
  });

  test('generateStaticParams produces exactly 5 locale entries', async () => {
    const mod = await import('../../src/app/[locale]/layout');
    const params = mod.generateStaticParams();

    expect(params).toEqual([
      { locale: 'en' },
      { locale: 'ko' },
      { locale: 'zh-CN' },
      { locale: 'ja' },
      { locale: 'es' },
    ]);
  });

  test('JSON-LD can be generated for each supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const result = generateJsonLd({
        name: `Test App - ${locale}`,
        description: `Description for ${locale}`,
        locale,
      });

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('SoftwareApplication');
      expect(result.inLanguage).toBe(locale);
      expect(result.name).toContain(locale);
    }
  });
});
