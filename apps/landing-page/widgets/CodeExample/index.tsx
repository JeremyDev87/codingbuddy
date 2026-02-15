import type { CodeExampleProps } from '@/types';

export const CodeExample = ({
  locale,
  beforeCode,
  afterCode,
}: CodeExampleProps) => (
  <section
    data-testid="code-example"
    lang={locale}
    aria-labelledby="code-example-heading"
  >
    <h2 id="code-example-heading">Code Example</h2>
    <pre data-label="before" aria-label="Code before using Codingbuddy">
      {beforeCode}
    </pre>
    <pre data-label="after" aria-label="Code after using Codingbuddy">
      {afterCode}
    </pre>
  </section>
);
