import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';

describe('AgentsShowcase', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

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
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('35 Specialist Agents');
  });

  it('should have id attribute for anchor navigation', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByTestId('agents-showcase')).toHaveAttribute('id', 'agents');
  });

  it('should have agents-all id on the grid for anchor target', () => {
    render(<AgentsShowcase locale="en" />);
    expect(document.getElementById('agents-all')).toBeInTheDocument();
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<AgentsShowcase locale="en" />);
    const section = screen.getByTestId('agents-showcase');
    expect(section).toHaveAttribute('aria-labelledby', 'agents-heading');
  });

  it('should render agent cards up to max 8', () => {
    render(<AgentsShowcase locale="en" />);
    // Total agents is 29, but only 8 should be visible
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    // Count visible agent cards (each has role="img" for the emoji)
    const agentIcons = screen.getAllByRole('img', { hidden: true });
    expect(agentIcons.length).toBeLessThanOrEqual(8);
  });

  it('should display agent count for all agents', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByText('29 agents')).toBeInTheDocument();
  });

  it('should not render a search input', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search agents...')).not.toBeInTheDocument();
  });

  it('should render category filter buttons', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Development' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UX' })).toBeInTheDocument();
  });

  it('should filter agents when category button is clicked', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    await user.click(screen.getByRole('button', { name: 'Security' }));

    expect(screen.getByText('Security Specialist')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should show View All Agents link when more than 8 agents', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByText('View All Agents')).toBeInTheDocument();
  });

  it('should not show View All Agents link when 8 or fewer agents', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    // Security category has only 2 agents
    await user.click(screen.getByRole('button', { name: 'Security' }));

    expect(screen.queryByText('View All Agents')).not.toBeInTheDocument();
  });

  it('should show all agents when View All is clicked', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    await user.click(screen.getByText('View All Agents'));

    // Should now show more than 8 agents
    const agentIcons = screen.getAllByRole('img', { hidden: true });
    expect(agentIcons.length).toBeGreaterThan(8);
    // View All link should be hidden, Show Less should appear
    expect(screen.queryByText('View All Agents')).not.toBeInTheDocument();
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });

  it('should collapse agents when Show Less is clicked', async () => {
    const user = userEvent.setup();
    render(<AgentsShowcase locale="en" />);

    await user.click(screen.getByText('View All Agents'));
    await user.click(screen.getByText('Show Less'));

    const agentIcons = screen.getAllByRole('img', { hidden: true });
    expect(agentIcons.length).toBeLessThanOrEqual(8);
    expect(screen.getByText('View All Agents')).toBeInTheDocument();
  });

  it('should auto-expand when URL hash is #agents-all', () => {
    window.location.hash = '#agents-all';
    render(<AgentsShowcase locale="en" />);

    const agentIcons = screen.getAllByRole('img', { hidden: true });
    expect(agentIcons.length).toBeGreaterThan(8);
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });
});
