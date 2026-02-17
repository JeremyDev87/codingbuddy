import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeBlock } from '@/widgets/CodeExample/ui/CodeBlock';

// next-themes mock
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// sonner mock (CopyButton 의존성)
vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

describe('CodeBlock', () => {
  const defaultProps = {
    code: 'const x = 1;',
    language: 'typescript',
    copyLabel: 'Copy code',
    copiedLabel: 'Copied!',
  };

  it('should render code with syntax highlighting', () => {
    render(<CodeBlock {...defaultProps} />);
    expect(screen.getByText('const')).toBeInTheDocument();
  });

  it('should display language badge', () => {
    render(<CodeBlock {...defaultProps} />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('should render line numbers', () => {
    render(<CodeBlock {...defaultProps} />);
    const lineNumbers = screen.getAllByTestId('line-number');
    expect(lineNumbers.length).toBeGreaterThan(0);
    expect(lineNumbers[0].textContent).toBe('1');
  });

  it('should include copy button', () => {
    render(<CodeBlock {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('should render multiline code with correct line numbers', () => {
    render(<CodeBlock {...defaultProps} code={'line1\nline2\nline3'} />);
    const lineNumbers = screen.getAllByTestId('line-number');
    expect(lineNumbers).toHaveLength(3);
    expect(lineNumbers[0].textContent).toBe('1');
    expect(lineNumbers[1].textContent).toBe('2');
    expect(lineNumbers[2].textContent).toBe('3');
  });

  it('should have aria-hidden on line numbers for screen readers', () => {
    render(<CodeBlock {...defaultProps} />);
    const lineNumbers = screen.getAllByTestId('line-number');
    expect(lineNumbers[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have aria-label with language on pre element', () => {
    render(<CodeBlock {...defaultProps} />);
    const pre = document.querySelector('pre');
    expect(pre).toHaveAttribute('aria-label', 'typescript code');
  });

  it('should wrap code in semantic code element', () => {
    render(<CodeBlock {...defaultProps} />);
    const code = document.querySelector('pre > code');
    expect(code).toBeInTheDocument();
  });
});
