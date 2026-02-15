import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeExample } from '@/widgets/CodeExample';

describe('CodeExample', () => {
  const defaultProps = {
    locale: 'en' as const,
    beforeCode: '// before',
    afterCode: '// after',
  };

  it('should render with required props', () => {
    render(<CodeExample {...defaultProps} />);
    expect(screen.getByTestId('code-example')).toBeInTheDocument();
  });

  it('should render with Korean locale', () => {
    render(<CodeExample {...defaultProps} locale="ko" />);
    expect(screen.getByTestId('code-example')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<CodeExample {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Code Example',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<CodeExample {...defaultProps} />);
    const section = screen.getByTestId('code-example');
    expect(section).toHaveAttribute('aria-labelledby', 'code-example-heading');
    expect(screen.getByText('Code Example')).toHaveAttribute(
      'id',
      'code-example-heading',
    );
  });

  it('should display before and after code snippets', () => {
    render(
      <CodeExample
        locale="en"
        beforeCode="const a = 1;"
        afterCode="const b = 2;"
      />,
    );
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    expect(screen.getByText('const b = 2;')).toBeInTheDocument();
  });

  it('should label code blocks with data-label attributes', () => {
    render(<CodeExample {...defaultProps} />);
    const beforePre = screen.getByText('// before').closest('pre');
    const afterPre = screen.getByText('// after').closest('pre');

    expect(beforePre).toHaveAttribute('data-label', 'before');
    expect(afterPre).toHaveAttribute('data-label', 'after');
  });

  it('should have aria-label on pre elements', () => {
    render(<CodeExample {...defaultProps} />);
    const beforePre = screen.getByText('// before').closest('pre');
    const afterPre = screen.getByText('// after').closest('pre');

    expect(beforePre).toHaveAttribute(
      'aria-label',
      'Code before using Codingbuddy',
    );
    expect(afterPre).toHaveAttribute(
      'aria-label',
      'Code after using Codingbuddy',
    );
  });

  it('should handle empty code strings', () => {
    render(<CodeExample locale="en" beforeCode="" afterCode="" />);
    expect(screen.getByTestId('code-example')).toBeInTheDocument();
  });
});
