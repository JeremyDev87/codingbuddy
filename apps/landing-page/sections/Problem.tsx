import { getTranslations } from 'next-intl/server';
import { FileWarning, Copy, ShieldOff, Unplug } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WidgetProps } from '@/types';

const painPoints = [
  { key: 'pain1', icon: FileWarning },
  { key: 'pain2', icon: Copy },
  { key: 'pain3', icon: ShieldOff },
  { key: 'pain4', icon: Unplug },
] as const;

export const Problem = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'problem' });

  return (
    <section
      data-testid="problem"
      lang={locale}
      aria-labelledby="problem-heading"
      className="bg-muted/50 px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 id="problem-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {painPoints.map(({ key, icon: Icon }) => (
            <Card key={key}>
              <CardHeader>
                <div className="text-destructive/80 mb-2">
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
