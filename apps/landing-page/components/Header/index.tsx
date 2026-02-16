'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { MobileMenu } from './MobileMenu';
import { NAV_ITEMS, FOCUS_RING_CLASSES } from './constants';

export const Header = () => {
  const t = useTranslations('header');

  return (
    <header
      className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md"
      aria-label="Site header"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Brand */}
        <Link
          href="/"
          className={`text-lg font-bold tracking-tight ${FOCUS_RING_CLASSES}`}
          aria-label={t('brand.homeLink')}
        >
          Codingbuddy
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              className={`text-muted-foreground hover:text-foreground text-sm font-medium transition-colors ${FOCUS_RING_CLASSES}`}
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        {/* Desktop Controls */}
        <div className="hidden items-center gap-1 md:flex">
          <LanguageSelector />
          <ThemeToggle />
        </div>

        {/* Mobile Menu */}
        <MobileMenu />
      </div>
    </header>
  );
};
