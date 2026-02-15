import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';

describe('AgentsShowcase', () => {
  it('should render with locale prop', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByTestId('agents-showcase')).toBeInTheDocument();
  });

  it('should render with Korean locale', () => {
    render(<AgentsShowcase locale="ko" />);
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'AI Agents',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<AgentsShowcase locale="en" />);
    const section = screen.getByTestId('agents-showcase');
    expect(section).toHaveAttribute('aria-labelledby', 'agents-heading');
    expect(screen.getByText('AI Agents')).toHaveAttribute(
      'id',
      'agents-heading',
    );
  });

  it('should set lang attribute matching locale', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute('lang', 'en');
  });
});
