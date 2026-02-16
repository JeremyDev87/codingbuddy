'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '@/types';

export const Hero = ({ locale }: WidgetProps) => {
  const t = useTranslations('hero');

  return (
    <section
      data-testid="hero"
      lang={locale}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-4 py-24 text-center sm:py-32"
    >
      {/* Background gradient effect */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="bg-primary/5 absolute top-0 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-0 right-0 size-[400px] translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <Badge variant="secondary" className="mb-6">
          {t('badge')}
        </Badge>

        <h1
          id="hero-heading"
          className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
        >
          {t('title')}
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg sm:text-xl">
          {t('description')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <a href="#quick-start">
              {t('cta')}
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://github.com/JeremyDev87/codingbuddy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
              {t('github')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
