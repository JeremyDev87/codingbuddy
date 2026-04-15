import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { WorkflowDemo } from '@/widgets/WorkflowDemo';

describe('WorkflowDemo', () => {
  it('should render with locale prop', () => {
    render(<WorkflowDemo locale="en" />);
    expect(screen.getByTestId('workflow-demo')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<WorkflowDemo locale="ko" />);
    expect(screen.getByTestId('workflow-demo')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<WorkflowDemo locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Your AI Coding Workflow, Supercharged',
    );
  });

  it('should render all 4 mode tabs', () => {
    render(<WorkflowDemo locale="en" />);
    expect(screen.getByRole('tab', { name: /PLAN/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ACT/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /EVAL/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /AUTO/ })).toBeInTheDocument();
  });

  it('should select PLAN tab by default', () => {
    render(<WorkflowDemo locale="en" />);
    expect(screen.getByRole('tab', { name: /PLAN/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch to ACT tab when clicked', async () => {
    const user = userEvent.setup();
    render(<WorkflowDemo locale="en" />);

    await user.click(screen.getByRole('tab', { name: /ACT/ }));
    expect(screen.getByRole('tab', { name: /ACT/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /PLAN/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('should display mode-specific content when switching tabs', async () => {
    const user = userEvent.setup();
    render(<WorkflowDemo locale="en" />);

    await user.click(screen.getByRole('tab', { name: /EVAL/ }));
    expect(screen.getByText(/Specialist council/)).toBeInTheDocument();
  });

  it('should render tabpanel with proper id', async () => {
    const user = userEvent.setup();
    render(<WorkflowDemo locale="en" />);

    await user.click(screen.getByRole('tab', { name: /AUTO/ }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-auto');
  });
});
