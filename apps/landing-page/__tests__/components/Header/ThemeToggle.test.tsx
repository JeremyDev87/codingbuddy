import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import '@/__tests__/__helpers__/next-themes-mock';
import { ThemeToggle } from '@/components/Header/ThemeToggle';

describe('ThemeToggle', () => {
  it('renders trigger button with accessible label', () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole('button', { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it('opens dropdown with theme options as radio items', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(
      screen.getByRole('menuitemradio', { name: /light/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: /dark/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: /system/i }),
    ).toBeInTheDocument();
  });

  it('indicates current theme via aria-checked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    // Default mock theme is 'system'
    expect(
      screen.getByRole('menuitemradio', { name: /system/i }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: /light/i }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('calls setTheme when option selected', async () => {
    const mockSetTheme = vi.fn();
    const { useTheme } = await import('next-themes');
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      themes: ['light', 'dark', 'system'],
      resolvedTheme: 'light',
      systemTheme: 'light',
      forcedTheme: undefined,
    });

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /dark/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
