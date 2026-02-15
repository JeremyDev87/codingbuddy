import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';

describe('AgentsShowcase', () => {
  it('should render with locale prop', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByTestId('agents-showcase')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<AgentsShowcase locale="ko" />);
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'AI Specialist Agents',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<AgentsShowcase locale="en" />);
    const section = screen.getByTestId('agents-showcase');
    expect(section).toHaveAttribute('aria-labelledby', 'agents-heading');
  });

  it('should render agent cards', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Security Specialist')).toBeInTheDocument();
  });

  it('should display agent count', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByText('29 agents')).toBeInTheDocument();
  });

  it('should display search input', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByPlaceholderText('Search agents...')).toBeInTheDocument();
  });

  it('should filter agents by search query', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    const searchInput = screen.getByPlaceholderText('Search agents...');
    await user.type(searchInput, 'frontend');

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Security Specialist')).not.toBeInTheDocument();
  });

  it('should show no results message when search has no matches', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    const searchInput = screen.getByPlaceholderText('Search agents...');
    await user.type(searchInput, 'xyznonexistent');

    expect(
      screen.getByText('No agents found matching your criteria'),
    ).toBeInTheDocument();
  });
});
