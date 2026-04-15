import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { SkillsLibrary } from '@/widgets/SkillsLibrary';

describe('SkillsLibrary', () => {
  it('should render with locale prop', () => {
    render(<SkillsLibrary locale="en" />);
    expect(screen.getByTestId('skills-library')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<SkillsLibrary locale="ko" />);
    expect(screen.getByTestId('skills-library')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<SkillsLibrary locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('50 Built-in Skills');
  });

  it('should render all 5 category tabs', () => {
    render(<SkillsLibrary locale="en" />);
    expect(screen.getByRole('tab', { name: /Development/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Team & Git/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Review & Code/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Intelligence/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Specialized/ })).toBeInTheDocument();
  });

  it('should select Development tab by default', () => {
    render(<SkillsLibrary locale="en" />);
    expect(screen.getByRole('tab', { name: /Development/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('should display Development skills by default', () => {
    render(<SkillsLibrary locale="en" />);
    expect(screen.getByText('TDD')).toBeInTheDocument();
    expect(screen.getByText('Refactoring')).toBeInTheDocument();
  });

  it('should switch category when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SkillsLibrary locale="en" />);

    await user.click(screen.getByRole('tab', { name: /Team & Git/ }));
    expect(screen.getByRole('tab', { name: /Team & Git/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Ship')).toBeInTheDocument();
  });

  it('should render tabpanel with proper id', async () => {
    const user = userEvent.setup();
    render(<SkillsLibrary locale="en" />);

    await user.click(screen.getByRole('tab', { name: /Intelligence/ }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'skills-panel-intelligence');
  });
});
