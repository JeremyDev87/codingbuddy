import { getTranslations } from 'next-intl/server';
import { DatabaseZap, Bot, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WidgetProps } from '@/types';

const benefits = [
  { key: 'benefit1', icon: DatabaseZap },
  { key: 'benefit2', icon: Bot },
  { key: 'benefit3', icon: ArrowRightLeft },
  { key: 'benefit4', icon: ShieldCheck },
] as const;

export const Solution = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'solution' });

  return (
    <section
      id="solution"
      data-testid="solution"
      lang={locale}
      aria-labelledby="solution-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 id="solution-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {benefits.map(({ key, icon: Icon }) => (
            <Card key={key} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="text-primary mb-2">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <CardTitle>{t(`${key}Title`)}</CardTitle>
                <CardDescription>{t(`${key}Desc`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
