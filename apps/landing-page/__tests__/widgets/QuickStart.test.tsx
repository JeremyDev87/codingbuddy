import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { QuickStart } from '@/widgets/QuickStart';

// sonner mock
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// copyToClipboard mock
vi.mock('@/lib/copyToClipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

describe('QuickStart', () => {
  it('should render with locale prop', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('quick-start')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<QuickStart locale="ko" />);
    expect(screen.getByTestId('quick-start')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Quick Start');
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<QuickStart locale="en" />);
    const section = screen.getByTestId('quick-start');
    expect(section).toHaveAttribute('aria-labelledby', 'quick-start-heading');
  });

  it('should display subtitle', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText('Get started in 3 simple steps')).toBeInTheDocument();
  });

  it('should render 3 accordion items', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText('Install the Package')).toBeInTheDocument();
    expect(screen.getByText('Configure Your AI Tool')).toBeInTheDocument();
    expect(screen.getByText('Start Coding')).toBeInTheDocument();
  });

  it('should show first step expanded by default', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText(/npx codingbuddy init/)).toBeInTheDocument();
  });

  it('should expand step on click', async () => {
    const user = userEvent.setup();
    render(<QuickStart locale="en" />);

    await user.click(screen.getByText('Configure Your AI Tool'));

    expect(screen.getByText(/mcpServers/)).toBeInTheDocument();
  });

  it('should render copy buttons', () => {
    render(<QuickStart locale="en" />);
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);
  });
});
