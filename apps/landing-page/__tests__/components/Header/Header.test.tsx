import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-mock';
import '@/__tests__/__helpers__/next-themes-mock';
import '@/__tests__/__helpers__/navigation-mock';
import { Header } from '@/components/Header';

describe('Header', () => {
  it('renders navigation with correct links', () => {
    render(<Header />);
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: /agents/i })).toHaveAttribute('href', '#agents');
    expect(screen.getByRole('link', { name: /quick start/i })).toHaveAttribute(
      'href',
      '#quick-start',
    );
  });

  it('renders brand link pointing to home with accessible label', () => {
    render(<Header />);
    const brandLink = screen.getByRole('link', { name: /codingbuddy/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/');
    expect(brandLink).toHaveAttribute('aria-label', expect.stringMatching(/codingbuddy/i));
  });

  it('renders theme toggle and language selector', () => {
    render(<Header />);
    expect(screen.getByLabelText(/toggle theme/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
  });

  it('has sticky positioning and aria-label', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header.className).toMatch(/sticky/);
    expect(header).toHaveAttribute('aria-label');
  });
});
