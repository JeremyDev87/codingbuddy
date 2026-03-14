import { getTranslations } from 'next-intl/server';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TerminalDemo } from '@/widgets/TerminalDemo';
import type { WidgetProps } from '@/types';

export const Hero = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'hero' });

  const terminalMessages = {
    terminalTitle: t('terminalTitle'),
    terminalCmd: t('terminalCmd'),
    terminalInstalling: t('terminalInstalling'),
    terminalRulesSynced: t('terminalRulesSynced'),
    terminalAgents: t('terminalAgents'),
    terminalWorkflow: t('terminalWorkflow'),
    terminalCursorrules: t('terminalCursorrules'),
    terminalClaudeMd: t('terminalClaudeMd'),
    terminalCodex: t('terminalCodex'),
    terminalAntigravity: t('terminalAntigravity'),
    terminalQ: t('terminalQ'),
    terminalKiro: t('terminalKiro'),
    terminalReady: t('terminalReady'),
  };

  return (
    <section
      data-testid="hero"
      lang={locale}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-dot-pattern px-4 py-20 sm:py-28"
    >
      {/* Background glow effects */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-1/4 size-[500px] rounded-full bg-terminal-purple/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 size-[400px] rounded-full bg-terminal-green/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <h1
          id="hero-heading"
          className="font-mono text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>

        <div className="mt-10">
          <TerminalDemo messages={terminalMessages} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-terminal-green font-mono text-black glow-green hover:bg-terminal-green/90"
            asChild
          >
            <a href="#quick-start">
              <span className="mr-1">$</span> {t('cta')}
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-terminal-border font-mono hover:border-terminal-purple hover:text-terminal-purple"
            asChild
          >
            <a
              href="https://github.com/JeremyDev87/codingbuddy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" aria-hidden="true" />
              {t('github')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
