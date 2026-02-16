import { describe, test, expect, vi } from 'vitest';
import { SUPPORTED_LOCALES } from '../../lib/locale';

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
});
