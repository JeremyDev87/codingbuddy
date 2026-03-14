import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { Features } from '@/widgets/Features';

describe('Features', () => {
  it('should render with locale prop', async () => {
    render(await Features({ locale: 'en' }));
    expect(screen.getByTestId('features')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await Features({ locale: 'ko' }));
    expect(screen.getByTestId('features')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await Features({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('What You Get');
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await Features({ locale: 'en' }));
    const section = screen.getByTestId('features');
    expect(section).toHaveAttribute('aria-labelledby', 'features-heading');
  });

  it('should have id attribute for anchor navigation', async () => {
    render(await Features({ locale: 'en' }));
    const section = screen.getByTestId('features');
    expect(section).toHaveAttribute('id', 'features');
  });

  it('should render 6 feature cards', async () => {
    render(await Features({ locale: 'en' }));
    expect(screen.getByText('Universal Rules')).toBeInTheDocument();
    expect(screen.getByText('35 AI Agents')).toBeInTheDocument();
    expect(screen.getByText('Structured Workflow')).toBeInTheDocument();
    expect(screen.getByText('Quality Built-in')).toBeInTheDocument();
    expect(screen.getByText('MCP Protocol')).toBeInTheDocument();
    expect(screen.getByText('Zero Config')).toBeInTheDocument();
  });

  it('should render feature descriptions', async () => {
    render(await Features({ locale: 'en' }));
    expect(screen.getByText(/One source of truth automatically applied/)).toBeInTheDocument();
    expect(screen.getByText(/Specialist agents for architecture/)).toBeInTheDocument();
    expect(screen.getByText(/PLAN → ACT → EVAL cycle/)).toBeInTheDocument();
    expect(screen.getByText(/TDD, SOLID principles/)).toBeInTheDocument();
    expect(screen.getByText(/Standard Model Context Protocol/)).toBeInTheDocument();
    expect(screen.getByText(/One command to install/)).toBeInTheDocument();
  });
});
