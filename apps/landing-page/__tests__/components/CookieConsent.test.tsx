import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { run } from 'axe-core';
import '@/__tests__/__helpers__/next-intl-mock';
import { CookieConsent } from '@/components/cookie-consent';

// Mock Vercel analytics to avoid loading external scripts
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render region with correct ARIA attributes', () => {
    render(<CookieConsent />);
    const region = screen.getByRole('region');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-label', 'Cookie consent');
  });

  it('should have no axe violations', async () => {
    const { container } = render(<CookieConsent />);
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should render translated button text', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });

  it('should hide dialog after accepting', async () => {
    const user = userEvent.setup();
    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('should hide dialog after declining', async () => {
    const user = userEvent.setup();
    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(localStorage.getItem('cookie-consent')).toBe('declined');
  });

  it('should not render dialog when consent already given', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    render(<CookieConsent />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
