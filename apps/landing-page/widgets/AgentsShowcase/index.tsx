import type { WidgetProps } from '@/types';

export const AgentsShowcase = ({ locale }: WidgetProps) => (
  <section
    data-testid="agents-showcase"
    lang={locale}
    aria-labelledby="agents-heading"
  >
    <h2 id="agents-heading">AI Agents</h2>
    <p>Agents showcase widget - coming soon</p>
  </section>
);
