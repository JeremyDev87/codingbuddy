import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '@/widgets/CodeExample/ui/CopyButton';

// sonner mock
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// copyToClipboard mock
const mockCopyToClipboard = vi.fn();
vi.mock('@/widgets/CodeExample/lib/copyToClipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

describe('CopyButton', () => {
  const defaultProps = {
    code: 'const x = 1;',
    copyLabel: 'Copy code',
    copiedLabel: 'Copied!',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCopyToClipboard.mockResolvedValue(true);
  });

  it('should render with copy label', () => {
    render(<CopyButton {...defaultProps} />);
    expect(screen.getByText('Copy code')).toBeInTheDocument();
  });

  it('should have accessible name from visible text', () => {
    render(<CopyButton {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  });

  it('should show copied state on click', async () => {
    const user = userEvent.setup();
    render(<CopyButton {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith('const x = 1;');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should stay in copy state and show error toast when clipboard fails', async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    const { toast } = await import('sonner');

    const user = userEvent.setup();
    render(<CopyButton {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Copy code')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Copy failed');
  });

  describe('timer behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should revert to copy state after 2000ms', async () => {
      render(<CopyButton {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy code')).toBeInTheDocument();
    });

    it('should reset timer on rapid clicks', async () => {
      render(<CopyButton {...defaultProps} />);

      // First click
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // Advance 1500ms, then click again
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
        await vi.advanceTimersByTimeAsync(0);
      });

      // After another 1500ms (3000ms total from first click),
      // should still be copied because second click reset the timer
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // After 2000ms from second click total, should revert
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByText('Copy code')).toBeInTheDocument();
    });
  });
});
