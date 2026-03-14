import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { BeforeAfter } from '@/widgets/BeforeAfter';

describe('BeforeAfter', () => {
  it('should render section with h2 heading', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('The Problem & Solution');
  });

  it('should render before and after labels', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('should render 6 config file names in before column', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    expect(screen.getByText('.cursorrules')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
    expect(screen.getByText('.codex/instructions.md')).toBeInTheDocument();
    expect(screen.getByText('.antigravity/rules.md')).toBeInTheDocument();
    expect(screen.getByText('.q/rules.md')).toBeInTheDocument();
    expect(screen.getByText('.kiro/rules.md')).toBeInTheDocument();
  });

  it('should render single source text in after column', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    expect(screen.getByText('codingbuddy-rules/.ai-rules/')).toBeInTheDocument();
  });

  it('should have data-testid="before-after"', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    expect(screen.getByTestId('before-after')).toBeInTheDocument();
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await BeforeAfter({ locale: 'en' }));
    const section = screen.getByTestId('before-after');
    expect(section).toHaveAttribute('aria-labelledby', 'before-after-heading');
  });

  it('should set lang attribute matching locale', async () => {
    render(await BeforeAfter({ locale: 'ko' }));
    expect(screen.getByTestId('before-after')).toHaveAttribute('lang', 'ko');
  });
});
