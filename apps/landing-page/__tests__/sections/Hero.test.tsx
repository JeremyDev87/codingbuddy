import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { Hero } from '@/sections/Hero';

describe('Hero', () => {
  it('should render with locale prop', async () => {
    render(await Hero({ locale: 'en' }));
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await Hero({ locale: 'ko' }));
    expect(screen.getByTestId('hero')).toHaveAttribute('lang', 'ko');
  });

  it('should display h1 heading with gradient text', async () => {
    render(await Hero({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Multi-AI Rules for Consistent Coding',
    );
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await Hero({ locale: 'en' }));
    const section = screen.getByTestId('hero');
    expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
  });

  it('should display badge', async () => {
    render(await Hero({ locale: 'en' }));
    expect(screen.getByText('Open Source')).toBeInTheDocument();
  });

  it('should display description', async () => {
    render(await Hero({ locale: 'en' }));
    expect(screen.getByText(/One ruleset for Cursor/)).toBeInTheDocument();
  });

  it('should render CTA button linking to quick-start', async () => {
    render(await Hero({ locale: 'en' }));
    const ctaLink = screen.getByRole('link', { name: /Get Started/i });
    expect(ctaLink).toHaveAttribute('href', '#quick-start');
  });

  it('should render GitHub button with external link', async () => {
    render(await Hero({ locale: 'en' }));
    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/JeremyDev87/codingbuddy',
    );
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
