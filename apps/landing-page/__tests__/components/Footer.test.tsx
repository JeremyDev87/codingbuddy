import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { run } from 'axe-core';

vi.mock('next/server', () => ({
  connection: async () => {},
}));

import '@/__tests__/__helpers__/next-intl-server-mock';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('should render footer landmark with aria-label', async () => {
    render(await Footer({ locale: 'en' }));
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute('aria-label', 'Site footer');
  });

  it('should have no axe violations', async () => {
    const { container } = render(
      <main id="main-content">
        <h1>Test</h1>
      </main>,
    );
    render(await Footer({ locale: 'en' }), { container });
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should display copyright with current year', async () => {
    render(await Footer({ locale: 'en' }));
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();
  });

  it('should have GitHub link with accessible label', async () => {
    render(await Footer({ locale: 'en' }));
    const githubLink = screen.getByRole('link', {
      name: /github.*codingbuddy/i,
    });
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/JeremyDev87/codingbuddy',
    );
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should display license info', async () => {
    render(await Footer({ locale: 'en' }));
    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });
});
