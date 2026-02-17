import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentCard } from '@/widgets/AgentsShowcase/ui/AgentCard';
import type { Agent } from '@/types';

const mockAgent: Agent = {
  id: 'frontend-developer',
  name: 'Frontend Developer',
  description: 'Modern React/Next.js specialist',
  category: 'Development',
  icon: '⚛️',
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
    const icon = screen.getByText('⚛️');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('role', 'img');
  });

  it('should render category badge with raw category when no translation', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('should render translated category when translatedCategory is provided', () => {
    render(<AgentCard agent={mockAgent} translatedCategory="개발" />);
    expect(screen.getByText('개발')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('should render all tags as badges', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});
