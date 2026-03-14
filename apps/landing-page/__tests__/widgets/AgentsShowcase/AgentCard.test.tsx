import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentCard } from '@/widgets/AgentsShowcase/ui/AgentCard';
import type { Agent } from '@/types';

const mockAgent: Agent = {
  id: 'frontend-developer',
  name: 'Frontend Developer',
  description: 'Modern React/Next.js specialist',
  category: 'Development',
  icon: '\u269B\uFE0F',
  tags: ['React', 'Next.js', 'TypeScript'],
  expertise: ['React', 'TypeScript'],
};

describe('AgentCard', () => {
  it('should render agent name', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('should render agent description', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Modern React/Next.js specialist')).toBeInTheDocument();
  });

  it('should render agent icon with aria-hidden', () => {
    render(<AgentCard agent={mockAgent} />);
    const icon = screen.getByText('\u269B\uFE0F');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('role', 'img');
  });

  it('should render category badge with raw category when no translation', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('should render translated category when translatedCategory is provided', () => {
    render(<AgentCard agent={mockAgent} translatedCategory={'\uAC1C\uBC1C'} />);
    const badge = document.querySelector('[data-slot="badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('\uAC1C\uBC1C');
    expect(badge).not.toHaveTextContent('Development');
  });
});
