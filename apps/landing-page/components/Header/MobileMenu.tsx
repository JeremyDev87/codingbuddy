'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { NAV_ITEMS, FOCUS_RING_CLASSES } from './constants';

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const t = useTranslations('header');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('mobileMenu.open')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]" closeLabel={t('mobileMenu.close')}>
        <SheetHeader>
          <SheetTitle>{t('mobileMenu.title')}</SheetTitle>
          <SheetDescription>{t('mobileMenu.description')}</SheetDescription>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4" aria-label={t('mobileMenu.title')}>
          {NAV_ITEMS.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-foreground/80 hover:text-foreground text-lg font-medium transition-colors ${FOCUS_RING_CLASSES}`}
            >
              {t(`nav.${key}`)}
            </a>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t pt-4">
            <ThemeToggle />
            <LanguageSelector />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
