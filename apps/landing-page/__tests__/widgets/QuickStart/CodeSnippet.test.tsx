import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeSnippet } from '@/widgets/QuickStart/ui/CodeSnippet';

// sonner mock
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// copyToClipboard mock
const mockCopyToClipboard = vi.fn();
vi.mock('@/lib/copyToClipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

describe('CodeSnippet', () => {
  const defaultProps = {
    code: 'npx codingbuddy init',
    copyLabel: 'Copy',
    copiedLabel: 'Copied!',
    failedLabel: 'Copy failed',
  };

  beforeEach(() => {
    mockCopyToClipboard.mockReset().mockResolvedValue(true);
  });

  it('should render code text', () => {
    render(<CodeSnippet {...defaultProps} />);
    expect(screen.getByText('npx codingbuddy init')).toBeInTheDocument();
  });

  it('should render copy button with label', () => {
    render(<CodeSnippet {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('should copy code to clipboard on click', async () => {
    const user = userEvent.setup();
    render(<CodeSnippet {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledWith('npx codingbuddy init');
    });
  });

  it('should show copied state after successful copy', async () => {
    const user = userEvent.setup();
    render(<CodeSnippet {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Copied!' }),
      ).toBeInTheDocument();
    });
  });

  it('should show error toast on copy failure', async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    render(<CodeSnippet {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Copy failed');
    });
  });
});
