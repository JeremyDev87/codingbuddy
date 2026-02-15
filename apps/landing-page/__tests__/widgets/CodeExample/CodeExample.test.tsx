import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { CodeExample } from '@/widgets/CodeExample';

// next-themes mock
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// sonner mock
vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

describe('CodeExample', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('should render with required props', () => {
    render(<CodeExample locale="en" />);
    expect(screen.getByTestId('code-example')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<CodeExample locale="ko" />);
    expect(screen.getByTestId('code-example')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<CodeExample locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'See the Difference',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<CodeExample locale="en" />);
    const section = screen.getByTestId('code-example');
    expect(section).toHaveAttribute('aria-labelledby', 'code-example-heading');
  });

  it('should render Before and After tabs', () => {
    render(<CodeExample locale="en" />);
    const beforeTabs = screen.getAllByRole('tab', { name: /before/i });
    const afterTabs = screen.getAllByRole('tab', { name: /after/i });
    expect(beforeTabs.length).toBeGreaterThan(0);
    expect(afterTabs.length).toBeGreaterThan(0);
  });

  it('should show Before tab content by default', () => {
    render(<CodeExample locale="en" />);
    const beforeTabs = screen.getAllByRole('tab', { name: /before/i });
    expect(beforeTabs[0]).toHaveAttribute('data-state', 'active');
  });

  it('should switch to After tab on click', async () => {
    const user = userEvent.setup();
    render(<CodeExample locale="en" />);

    const afterTabs = screen.getAllByRole('tab', { name: /after/i });
    await user.click(afterTabs[0]);

    expect(afterTabs[0]).toHaveAttribute('data-state', 'active');
  });

  it('should render copy buttons', () => {
    render(<CodeExample locale="en" />);
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('should display subtitle', () => {
    render(<CodeExample locale="en" />);
    expect(screen.getByText(/one ruleset replaces/i)).toBeInTheDocument();
  });
});
