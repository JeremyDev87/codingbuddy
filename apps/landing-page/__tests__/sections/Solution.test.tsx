import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { Solution } from '@/sections/Solution';

describe('Solution', () => {
  it('should render with locale prop', async () => {
    render(await Solution({ locale: 'en' }));
    expect(screen.getByTestId('solution')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await Solution({ locale: 'ko' }));
    expect(screen.getByTestId('solution')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await Solution({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'One Ruleset. All Tools.',
    );
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await Solution({ locale: 'en' }));
    const section = screen.getByTestId('solution');
    expect(section).toHaveAttribute('aria-labelledby', 'solution-heading');
  });

  it('should display subtitle', async () => {
    render(await Solution({ locale: 'en' }));
    expect(
      screen.getByText(/Codingbuddy gives your AI assistants/),
    ).toBeInTheDocument();
  });

  it('should render 4 benefit cards', async () => {
    render(await Solution({ locale: 'en' }));
    expect(screen.getByText('Single Source of Truth')).toBeInTheDocument();
    expect(screen.getByText('29 Specialist Agents')).toBeInTheDocument();
    expect(screen.getByText('Structured Workflow')).toBeInTheDocument();
    expect(screen.getByText('Quality Built-in')).toBeInTheDocument();
  });

  it('should render benefit descriptions', async () => {
    render(await Solution({ locale: 'en' }));
    expect(
      screen.getByText(/One ruleset automatically applied/),
    ).toBeInTheDocument();
  });
});
