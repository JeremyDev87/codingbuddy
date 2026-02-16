import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { isValidLocale, SUPPORTED_LOCALES } from '@/lib/locale';
import { SetDocumentLang } from '@/components/set-document-lang';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/cookie-consent';

const CLIENT_NAMESPACES = [
  'header',
  'cookieConsent',
  'faq',
  'agents',
  'codeExample',
  'quickStart',
] as const;

const pickClientMessages = (
  messages: AbstractIntlMessages,
): AbstractIntlMessages =>
  Object.fromEntries(
    CLIENT_NAMESPACES.filter(ns => ns in messages).map(ns => [
      ns,
      messages[ns],
    ]),
  );

export const generateStaticParams = () =>
  SUPPORTED_LOCALES.map(locale => ({ locale }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });

  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map(loc => [loc, `/${loc}`]),
  );

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale,
    },
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
  };
};

interface LocaleLayoutProps {
  children: ReactNode;
  agents: ReactNode;
  code_example: ReactNode;
  quick_start: ReactNode;
  params: Promise<{ locale: string }>;
}

const LocaleLayout = async ({
  children,
  agents,
  code_example,
  quick_start,
  params,
}: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickClientMessages(messages)}
    >
      <Header />
      <main
        id="main-content"
        lang={locale}
        className="flex min-h-screen flex-col"
      >
        <SetDocumentLang locale={locale} />
        {children}
        {agents}
        {code_example}
        {quick_start}
      </main>
      <Suspense>
        <Footer locale={locale} />
      </Suspense>
      <Suspense>
        <CookieConsent />
      </Suspense>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
