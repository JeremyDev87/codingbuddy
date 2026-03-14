import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { run } from 'axe-core';
import '@/__tests__/__helpers__/next-intl-server-mock';
import '@/__tests__/__helpers__/next-intl-mock';
import { Hero } from '@/widgets/Hero';
import { BeforeAfter } from '@/widgets/BeforeAfter';
import { Features } from '@/widgets/Features';
import { SupportedTools } from '@/widgets/SupportedTools';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';
import { QuickStart } from '@/widgets/QuickStart';
import AgentsLoading from '@/src/app/[locale]/@agents/loading';
import QuickStartLoading from '@/src/app/[locale]/@quick_start/loading';
import { SlotError } from '@/components/SlotError';

/**
 * Locale Page Accessibility Tests
 * Tests the widget-slot architecture components for a11y compliance.
 */
const renderLocalePage = async (locale: 'en' | 'ko' = 'en') => {
  const heroJsx = await Hero({ locale });
  const beforeAfterJsx = await BeforeAfter({ locale });
  const featuresJsx = await Features({ locale });
  const supportedToolsJsx = await SupportedTools({ locale });

  return render(
    <main id="main-content">
      {heroJsx}
      {beforeAfterJsx}
      {featuresJsx}
      {supportedToolsJsx}
      <AgentsShowcase locale={locale} />
      <QuickStart locale={locale} />
    </main>,
  );
};

describe('Locale Page Accessibility', () => {
  test('should have no axe violations (English)', async () => {
    const { container } = await renderLocalePage('en');
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('should have no axe violations (Korean)', async () => {
    const { container } = await renderLocalePage('ko');
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  test('main landmark exists with correct id', async () => {
    const { getByRole } = await renderLocalePage();
    const main = getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  test('heading hierarchy is valid', async () => {
    const { container } = await renderLocalePage();
    const h1 = container.querySelector('h1');
    const h2Elements = container.querySelectorAll('h2');
    expect(h1).toBeInTheDocument();
    expect(h2Elements.length).toBeGreaterThanOrEqual(4);
  });

  test('all sections have test ids', async () => {
    const { getByTestId } = await renderLocalePage();
    expect(getByTestId('hero')).toBeInTheDocument();
    expect(getByTestId('before-after')).toBeInTheDocument();
    expect(getByTestId('features')).toBeInTheDocument();
    expect(getByTestId('supported-tools')).toBeInTheDocument();
    expect(getByTestId('agents-showcase')).toBeInTheDocument();
    expect(getByTestId('quick-start')).toBeInTheDocument();
  });

  test('all sections have lang attribute', async () => {
    const { getByTestId } = await renderLocalePage();
    expect(getByTestId('hero')).toHaveAttribute('lang', 'en');
    expect(getByTestId('before-after')).toHaveAttribute('lang', 'en');
    expect(getByTestId('features')).toHaveAttribute('lang', 'en');
    expect(getByTestId('supported-tools')).toHaveAttribute('lang', 'en');
    expect(getByTestId('agents-showcase')).toHaveAttribute('lang', 'en');
    expect(getByTestId('quick-start')).toHaveAttribute('lang', 'en');
  });

  test('all sections have aria-labelledby', async () => {
    await renderLocalePage();
    expect(screen.getByTestId('hero')).toHaveAttribute('aria-labelledby', 'hero-heading');
    expect(screen.getByTestId('before-after')).toHaveAttribute(
      'aria-labelledby',
      'before-after-heading',
    );
    expect(screen.getByTestId('features')).toHaveAttribute('aria-labelledby', 'features-heading');
    expect(screen.getByTestId('supported-tools')).toHaveAttribute(
      'aria-labelledby',
      'supported-tools-heading',
    );
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute(
      'aria-labelledby',
      'agents-heading',
    );
    expect(screen.getByTestId('quick-start')).toHaveAttribute(
      'aria-labelledby',
      'quick-start-heading',
    );
  });

  test('Korean locale sets correct lang attributes', async () => {
    const { getByTestId } = await renderLocalePage('ko');
    expect(getByTestId('hero')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('before-after')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('features')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('supported-tools')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('agents-showcase')).toHaveAttribute('lang', 'ko');
    expect(getByTestId('quick-start')).toHaveAttribute('lang', 'ko');
  });
});

describe('Loading State Accessibility', () => {
  test('loading states should have no axe violations', async () => {
    const { container } = render(
      <main id="main-content">
        <AgentsLoading />
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
