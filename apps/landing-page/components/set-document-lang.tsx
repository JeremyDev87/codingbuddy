'use client';

import { useEffect } from 'react';
import type { SupportedLocale } from '@/lib/locale';

interface SetDocumentLangProps {
  locale: SupportedLocale;
}

export const SetDocumentLang = ({ locale }: SetDocumentLangProps) => {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
};
