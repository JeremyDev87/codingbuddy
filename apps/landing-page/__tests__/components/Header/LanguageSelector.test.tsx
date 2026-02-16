import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { mockReplace } from '@/__tests__/__helpers__/navigation-mock';
import { LanguageSelector } from '@/components/Header/LanguageSelector';

describe('LanguageSelector', () => {
  it('renders trigger button with accessible label', () => {
    render(<LanguageSelector />);
    expect(
      screen.getByRole('button', { name: /select language/i }),
    ).toBeInTheDocument();
  });

  it('opens dropdown with all language options as radio items', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: /select language/i }));
    expect(
      screen.getByRole('menuitemradio', { name: 'English' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: '한국어' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: '日本語' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: '中文' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: 'Español' }),
    ).toBeInTheDocument();
  });

  it('indicates current locale via aria-checked', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: /select language/i }));
    // Default mock locale is 'en'
    expect(
      screen.getByRole('menuitemradio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: '한국어' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('navigates to selected locale', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: /select language/i }));
    await user.click(screen.getByRole('menuitemradio', { name: '한국어' }));
    expect(mockReplace).toHaveBeenCalledWith('/', { locale: 'ko' });
  });
});
