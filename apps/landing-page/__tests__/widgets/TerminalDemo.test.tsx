import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalDemo, type TerminalMessages } from '@/widgets/TerminalDemo';

const mockMessages: TerminalMessages = {
  terminalTitle: 'codingbuddy - terminal',
  terminalCmd: 'npx codingbuddy init',
  terminalInstalling: 'Installing codingbuddy...',
  terminalRulesSynced: 'Rules synced',
  terminalAgents: '37 agents loaded',
  terminalWorkflow: 'PLAN → ACT → EVAL workflow ready',
  terminalSkills: '50 built-in skills loaded',
  terminalCursorrules: '.cursorrules',
  terminalClaudeMd: 'CLAUDE.md',
  terminalCodex: '.codex/',
  terminalAntigravity: '.antigravity/',
  terminalQ: '.q/',
  terminalKiro: '.kiro/',
  terminalWindsurf: '.windsurfrules',
  terminalAider: '.aider.conf.yml',
  terminalOpenCode: '.opencode/',
  terminalReady: 'Ready to code!',
};

describe('TerminalDemo', () => {
  it('should render terminal container with title text', () => {
    render(<TerminalDemo messages={mockMessages} />);
    expect(screen.getByText('codingbuddy - terminal')).toBeInTheDocument();
  });

  it('should render command line', () => {
    render(<TerminalDemo messages={mockMessages} />);
    expect(screen.getByText('npx codingbuddy init')).toBeInTheDocument();
  });

  it('should render all terminal output lines', () => {
    render(<TerminalDemo messages={mockMessages} />);
    expect(screen.getByText('Installing codingbuddy...')).toBeInTheDocument();
    expect(screen.getByText('Rules synced')).toBeInTheDocument();
    expect(screen.getByText('37 agents loaded')).toBeInTheDocument();
    expect(screen.getByText('PLAN → ACT → EVAL workflow ready')).toBeInTheDocument();
    expect(screen.getByText('50 built-in skills loaded')).toBeInTheDocument();
  });

  it('should render tool file list', () => {
    render(<TerminalDemo messages={mockMessages} />);
    expect(screen.getByText('.cursorrules')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
    expect(screen.getByText('.codex/')).toBeInTheDocument();
    expect(screen.getByText('.antigravity/')).toBeInTheDocument();
    expect(screen.getByText('.q/')).toBeInTheDocument();
    expect(screen.getByText('.kiro/')).toBeInTheDocument();
    expect(screen.getByText('.windsurfrules')).toBeInTheDocument();
    expect(screen.getByText('.aider.conf.yml')).toBeInTheDocument();
    expect(screen.getByText('.opencode/')).toBeInTheDocument();
  });

  it('should have appropriate aria attributes', () => {
    render(<TerminalDemo messages={mockMessages} />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Terminal demo showing codingbuddy installation');
  });

  it('should render ready message', () => {
    render(<TerminalDemo messages={mockMessages} />);
    expect(screen.getByText('Ready to code!')).toBeInTheDocument();
  });
});
