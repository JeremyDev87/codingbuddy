import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isValidLocale, SUPPORTED_LOCALES } from '@/lib/locale';
import { SetDocumentLang } from '@/components/set-document-lang';

export const generateStaticParams = () =>
  SUPPORTED_LOCALES.map(locale => ({ locale }));

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

  return (
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
  );
};

export default LocaleLayout;
