import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-mock';
import { Problem } from '@/sections/Problem';

describe('Problem', () => {
  it('should render with locale prop', () => {
    render(<Problem locale="en" />);
    expect(screen.getByTestId('problem')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<Problem locale="ko" />);
    expect(screen.getByTestId('problem')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<Problem locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'The Problem with AI Coding Today',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<Problem locale="en" />);
    const section = screen.getByTestId('problem');
    expect(section).toHaveAttribute('aria-labelledby', 'problem-heading');
  });

  it('should display subtitle', () => {
    render(<Problem locale="en" />);
    expect(
      screen.getByText(/Every AI tool has its own rules format/),
    ).toBeInTheDocument();
  });

  it('should render 4 pain points', () => {
    render(<Problem locale="en" />);
    expect(screen.getByText('Inconsistent Rules')).toBeInTheDocument();
    expect(screen.getByText('Duplicated Effort')).toBeInTheDocument();
    expect(screen.getByText('No Quality Standards')).toBeInTheDocument();
    expect(screen.getByText('Lost Context')).toBeInTheDocument();
  });

  it('should render pain point descriptions', () => {
    render(<Problem locale="en" />);
    expect(
      screen.getByText(/Each tool needs its own config/),
    ).toBeInTheDocument();
  });
});
