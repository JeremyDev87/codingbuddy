import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-server-mock';
import '@/__tests__/__helpers__/next-intl-mock';
import { FAQ } from '@/sections/FAQ';

describe('FAQ', () => {
  it('should render with locale prop', async () => {
    render(await FAQ({ locale: 'en' }));
    expect(screen.getByTestId('faq')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await FAQ({ locale: 'ko' }));
    expect(screen.getByTestId('faq')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await FAQ({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Frequently Asked Questions',
    );
  });

  it('should have id attribute for anchor navigation', async () => {
    render(await FAQ({ locale: 'en' }));
    expect(screen.getByTestId('faq')).toHaveAttribute('id', 'faq');
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await FAQ({ locale: 'en' }));
    const section = screen.getByTestId('faq');
    expect(section).toHaveAttribute('aria-labelledby', 'faq-heading');
  });

  it('should render 6 FAQ items', async () => {
    render(await FAQ({ locale: 'en' }));
    expect(screen.getByText('What AI tools does Codingbuddy support?')).toBeInTheDocument();
    expect(screen.getByText('How does the PLAN/ACT/EVAL workflow work?')).toBeInTheDocument();
    expect(screen.getByText('Do I need to configure each AI tool separately?')).toBeInTheDocument();
    expect(screen.getByText('Is Codingbuddy free and open source?')).toBeInTheDocument();
    expect(screen.getByText('Can I customize the rules and agents?')).toBeInTheDocument();
    expect(screen.getByText('What are specialist agents?')).toBeInTheDocument();
  });

  it('should show first item expanded by default', async () => {
    render(await FAQ({ locale: 'en' }));
    expect(screen.getByText(/Codingbuddy supports Cursor/)).toBeInTheDocument();
  });

  it('should expand item on click', async () => {
    const user = userEvent.setup();
    render(await FAQ({ locale: 'en' }));

    await user.click(screen.getByText('How does the PLAN/ACT/EVAL workflow work?'));

    expect(screen.getByText(/PLAN mode designs your implementation/)).toBeInTheDocument();
  });
});
