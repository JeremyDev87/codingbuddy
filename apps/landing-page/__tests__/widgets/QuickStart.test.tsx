import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('should render vertical step flow container', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('step-flow')).toBeInTheDocument();
  });

  it('should render 3 steps with titles', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
    expect(screen.getByTestId('step-3')).toBeInTheDocument();
  });

  it('should display step titles as headings', () => {
    render(<QuickStart locale="en" />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(3);
    expect(headings[0]).toHaveTextContent(/^Install$/);
    expect(headings[1]).toHaveTextContent(/^Configure$/);
    expect(headings[2]).toHaveTextContent(/^Code$/);
  });

  it('should display step descriptions', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText(/Add codingbuddy-rules to your project/)).toBeInTheDocument();
    expect(screen.getByText(/Add the MCP server to your AI tool/)).toBeInTheDocument();
    expect(screen.getByText(/Use PLAN, ACT, EVAL modes/)).toBeInTheDocument();
  });

  it('should display all code snippets without requiring interaction', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText(/npx codingbuddy init/)).toBeInTheDocument();
    expect(screen.getByText(/mcpServers/)).toBeInTheDocument();
    expect(screen.getByText(/PLAN design auth feature/)).toBeInTheDocument();
  });

  it('should render step number badges', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render vertical connectors between steps', () => {
    render(<QuickStart locale="en" />);
    const connectors = screen.getAllByTestId('step-connector');
    expect(connectors).toHaveLength(2);
  });

  it('should render copy buttons for each step', () => {
    render(<QuickStart locale="en" />);
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(3);
  });
});
