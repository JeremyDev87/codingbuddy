import type { WidgetProps } from '@/types';

export const QuickStart = ({ locale }: WidgetProps) => (
  <section
    data-testid="quick-start"
    lang={locale}
    aria-labelledby="quick-start-heading"
  >
    <h2 id="quick-start-heading">Quick Start</h2>
    <p>Quick start widget - coming soon</p>
  </section>
);
