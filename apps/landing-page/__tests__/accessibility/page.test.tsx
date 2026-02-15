import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { run } from 'axe-core';
import '@/__tests__/__helpers__/next-intl-mock';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';
import { CodeExample } from '@/widgets/CodeExample';
import { QuickStart } from '@/widgets/QuickStart';
import AgentsLoading from '@/src/app/[locale]/@agents/loading';
import CodeExampleLoading from '@/src/app/[locale]/@code_example/loading';
import QuickStartLoading from '@/src/app/[locale]/@quick_start/loading';
import { SlotError } from '@/components/SlotError';

/**
 * Locale Page Accessibility Tests
 * Tests the widget-slot architecture components for a11y compliance.
 */
const renderLocalePage = (locale: 'en' | 'ko' = 'en') =>
  render(
    <main id="main-content">
      <section className="py-16 px-4 text-center" lang={locale}>
        <h1>Codingbuddy</h1>
        <p>Multi-AI Rules for Consistent Coding</p>
      </section>
      <AgentsShowcase locale={locale} />
      <CodeExample
        locale={locale}
        beforeCode="// before"
        afterCode="// after"
      />
      <QuickStart locale={locale} />
    </main>,
  );

describe('Locale Page Accessibility', () => {
  test('should have no axe violations (English)', async () => {
    const { container } = renderLocalePage('en');
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('should have no axe violations (Korean)', async () => {
    const { container } = renderLocalePage('ko');
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('main landmark exists with correct id', () => {
    const { getByRole } = renderLocalePage();
    const main = getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  test('heading hierarchy is valid', () => {
    const { container } = renderLocalePage();
    const h1 = container.querySelector('h1');
    const h2Elements = container.querySelectorAll('h2');
    expect(h1).toBeInTheDocument();
    expect(h2Elements.length).toBe(3);
  });

  test('all widget sections have test ids', () => {
    const { getByTestId } = renderLocalePage();
    expect(getByTestId('agents-showcase')).toBeInTheDocument();
    expect(getByTestId('code-example')).toBeInTheDocument();
    expect(getByTestId('quick-start')).toBeInTheDocument();
  });

  test('widget sections have lang attribute', () => {
    const { getByTestId } = renderLocalePage();
    expect(getByTestId('agents-showcase')).toHaveAttribute('lang', 'en');
    expect(getByTestId('code-example')).toHaveAttribute('lang', 'en');
    expect(getByTestId('quick-start')).toHaveAttribute('lang', 'en');
  });

  test('widget sections have aria-labelledby', () => {
    renderLocalePage();
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute(
      'aria-labelledby',
      'agents-heading',
    );
    expect(screen.getByTestId('code-example')).toHaveAttribute(
      'aria-labelledby',
      'code-example-heading',
    );
    expect(screen.getByTestId('quick-start')).toHaveAttribute(
      'aria-labelledby',
      'quick-start-heading',
    );
  });

  test('Korean locale sets correct lang attributes', () => {
    const { getByTestId } = renderLocalePage('ko');
    expect(getByTestId('agents-showcase')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('code-example')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('quick-start')).toHaveAttribute('lang', 'ko');
  });
});

describe('Loading State Accessibility', () => {
  test('loading states should have no axe violations', async () => {
    const { container } = render(
      <main id="main-content">
        <AgentsLoading />
        <CodeExampleLoading />
        <QuickStartLoading />
      </main>,
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('loading states have aria-busy attribute', () => {
    const { container } = render(
      <>
        <AgentsLoading />
        <CodeExampleLoading />
        <QuickStartLoading />
      </>,
    );
    const sections = container.querySelectorAll('section');
    sections.forEach(section => {
      expect(section).toHaveAttribute('aria-busy', 'true');
    });
  });
});

describe('Error State Accessibility', () => {
  const noop = () => {};

  test('error state should have no axe violations', async () => {
    const { container } = render(
      <main id="main-content">
        <h1>Codingbuddy</h1>
        <SlotError reset={noop} slotName="agents" />
      </main>,
    );
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('error state uses role="alert"', () => {
    render(<SlotError reset={noop} slotName="agents" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
