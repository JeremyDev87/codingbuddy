'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'cookie-consent';
const emptySubscribe = () => () => {};

export const CookieConsent = () => {
  const t = useTranslations('cookieConsent');
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [consent, setConsent] = useState<string | null>(null);
  const declineRef = useRef<HTMLButtonElement>(null);

  const effectiveConsent = isClient
    ? (consent ?? localStorage.getItem(CONSENT_KEY))
    : null;

  useEffect(() => {
    if (isClient && effectiveConsent === null) {
      declineRef.current?.focus();
    }
  }, [isClient, effectiveConsent]);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setConsent('declined');
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      {effectiveConsent === 'accepted' && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}

      {effectiveConsent === null && (
        <div
          role="region"
          aria-label={t('label')}
          className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-500"
        >
          <div className="border-border bg-background/95 border-t backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">{t('message')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  ref={declineRef}
                  variant="outline"
                  size="sm"
                  onClick={handleDecline}
                >
                  {t('decline')}
                </Button>
                <Button size="sm" onClick={handleAccept}>
                  {t('accept')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
