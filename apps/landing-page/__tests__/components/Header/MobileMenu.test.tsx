import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import '@/__tests__/__helpers__/next-themes-mock';
import '@/__tests__/__helpers__/navigation-mock';
import { MobileMenu } from '@/components/Header/MobileMenu';

describe('MobileMenu', () => {
  it('renders trigger button with accessible label', () => {
    render(<MobileMenu />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('opens sheet with navigation links', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Site navigation and settings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute('href', '#solution');
    expect(screen.getByRole('link', { name: /agents/i })).toHaveAttribute('href', '#agents');
    expect(screen.getByRole('link', { name: /quick start/i })).toHaveAttribute(
      'href',
      '#quick-start',
    );
    expect(screen.getByRole('link', { name: /faq/i })).toHaveAttribute('href', '#faq');
  });

  it('has accessible navigation region with aria-label', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByRole('navigation', { name: /navigation/i })).toBeInTheDocument();
  });

  it('has localized close button label', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByText('Close menu')).toBeInTheDocument();
  });

  it('closes sheet when navigation link is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    const featuresLink = screen.getByRole('link', { name: /features/i });
    await user.click(featuresLink);

    // Sheet should close - the dialog should no longer be present
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
  });

  it('renders theme toggle and language selector inside sheet', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByLabelText(/toggle theme/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
  });
});
