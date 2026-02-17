import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlotError } from '@/components/SlotError';

describe('SlotError', () => {
  const defaultProps = {
    reset: vi.fn(),
    slotName: 'agents' as const,
  };

  it('should render error message with slot name', () => {
    render(<SlotError {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Failed to load agents');
  });

  it('should display user-friendly error description', () => {
    render(<SlotError {...defaultProps} />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('should have role="alert" for screen readers', () => {
    render(<SlotError {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have aria-live="assertive"', () => {
    render(<SlotError {...defaultProps} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('should render try again button with accessible label', () => {
    render(<SlotError {...defaultProps} />);
    const button = screen.getByRole('button', {
      name: /try loading agents again/i,
    });
    expect(button).toBeInTheDocument();
  });

  it('should call reset when try again button is clicked', async () => {
    const reset = vi.fn();
    render(<SlotError reset={reset} slotName="agents" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button'));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('should focus the try again button on mount', () => {
    render(<SlotError {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('should render with different slot names', () => {
    render(<SlotError reset={vi.fn()} slotName="code example" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Failed to load code example',
    );
    expect(
      screen.getByRole('button', { name: /try loading code example again/i }),
    ).toBeInTheDocument();
  });
});
