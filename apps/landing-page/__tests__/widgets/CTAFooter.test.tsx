import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/server', () => ({
  connection: async () => {},
}));

import '@/__tests__/__helpers__/next-intl-server-mock';
import { CTAFooter } from '@/widgets/CTAFooter';

describe('CTAFooter', () => {
  it('should render CTA heading', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Ready to unify your AI coding/i }),
    ).toBeInTheDocument();
  });

  it('should render install command', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(screen.getByText(/npx codingbuddy init/)).toBeInTheDocument();
  });

  it('should render GitHub button with external link', async () => {
    render(await CTAFooter({ locale: 'en' }));
    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/JeremyDev87/codingbuddy');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render Documentation button with external link', async () => {
    render(await CTAFooter({ locale: 'en' }));
    const docsLink = screen.getByRole('link', { name: /Documentation/i });
    expect(docsLink).toHaveAttribute('href', 'https://github.com/JeremyDev87/codingbuddy#readme');
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render copyright with current year', async () => {
    render(await CTAFooter({ locale: 'en' }));
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} Codingbuddy`))).toBeInTheDocument();
  });

  it('should render made for developers text', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(screen.getByText(/Made for developers who ship with AI/)).toBeInTheDocument();
  });

  it('should have CTA section with data-testid', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });

  it('should have footer with data-testid', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should have aria-labelledby on CTA section', async () => {
    render(await CTAFooter({ locale: 'en' }));
    expect(screen.getByTestId('cta')).toHaveAttribute('aria-labelledby', 'cta-heading');
  });

  it('should set lang attribute on CTA section', async () => {
    render(await CTAFooter({ locale: 'ko' }));
    expect(screen.getByTestId('cta')).toHaveAttribute('lang', 'ko');
  });
});
