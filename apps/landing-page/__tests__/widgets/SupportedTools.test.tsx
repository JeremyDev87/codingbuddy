import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { SupportedTools } from '@/widgets/SupportedTools';

describe('SupportedTools', () => {
  it('should render with locale prop', async () => {
    render(await SupportedTools({ locale: 'en' }));
    expect(screen.getByTestId('supported-tools')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await SupportedTools({ locale: 'ko' }));
    expect(screen.getByTestId('supported-tools')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await SupportedTools({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Works with your favorite AI tools',
    );
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await SupportedTools({ locale: 'en' }));
    const section = screen.getByTestId('supported-tools');
    expect(section).toHaveAttribute('aria-labelledby', 'supported-tools-heading');
  });

  it('should render all 6 tool names', async () => {
    render(await SupportedTools({ locale: 'en' }));
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Codex')).toBeInTheDocument();
    expect(screen.getByText('Antigravity')).toBeInTheDocument();
    expect(screen.getByText('Amazon Q')).toBeInTheDocument();
    expect(screen.getByText('Kiro')).toBeInTheDocument();
  });

  it('should render MCP-compatible tool text', async () => {
    render(await SupportedTools({ locale: 'en' }));
    expect(screen.getByText('+ any MCP-compatible tool')).toBeInTheDocument();
  });
});
