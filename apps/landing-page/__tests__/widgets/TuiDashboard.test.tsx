import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { TuiDashboard } from '@/widgets/TuiDashboard';

describe('TuiDashboard', () => {
  it('should render with locale prop', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByTestId('tui-dashboard')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await TuiDashboard({ locale: 'ko' }));
    expect(screen.getByTestId('tui-dashboard')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Real-Time Agent Dashboard',
    );
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    const section = screen.getByTestId('tui-dashboard');
    expect(section).toHaveAttribute('aria-labelledby', 'tui-dashboard-heading');
  });

  it('should have id attribute for anchor navigation', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    const section = screen.getByTestId('tui-dashboard');
    expect(section).toHaveAttribute('id', 'tui-dashboard');
  });

  it('should render 4 feature cards', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByText('FlowMap')).toBeInTheDocument();
    expect(screen.getByText('Focused Agent')).toBeInTheDocument();
    expect(screen.getByText('Checklist')).toBeInTheDocument();
    expect(screen.getByText('Activity Chart')).toBeInTheDocument();
  });

  it('should render feature descriptions', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByText(/Visual pipeline showing active agents/)).toBeInTheDocument();
    expect(screen.getByText(/Live view of the active agent/)).toBeInTheDocument();
    expect(screen.getByText(/Task completion tracking synced/)).toBeInTheDocument();
    expect(screen.getByText(/Real-time tool invocation bar chart/)).toBeInTheDocument();
  });

  it('should render command block', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByText('npx codingbuddy tui')).toBeInTheDocument();
  });

  it('should render multi-session info', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    expect(screen.getByText(/Multiple Claude Code sessions/)).toBeInTheDocument();
  });

  it('should render screenshot image', async () => {
    render(await TuiDashboard({ locale: 'en' }));
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'alt',
      'Codingbuddy TUI Dashboard showing agent pipeline, activity charts, and task progress',
    );
  });
});
