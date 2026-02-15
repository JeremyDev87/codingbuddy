import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStart } from '@/widgets/QuickStart';

describe('QuickStart', () => {
  it('should render with locale prop', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('quick-start')).toBeInTheDocument();
  });

  it('should render with Korean locale', () => {
    render(<QuickStart locale="ko" />);
    expect(screen.getByTestId('quick-start')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Quick Start',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<QuickStart locale="en" />);
    const section = screen.getByTestId('quick-start');
    expect(section).toHaveAttribute('aria-labelledby', 'quick-start-heading');
    expect(screen.getByText('Quick Start')).toHaveAttribute(
      'id',
      'quick-start-heading',
    );
  });

  it('should set lang attribute matching locale', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('quick-start')).toHaveAttribute('lang', 'en');
  });
});
