import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentsLoading from '@/src/app/[locale]/@agents/loading';
import QuickStartLoading from '@/src/app/[locale]/@quick_start/loading';

describe('Loading States', () => {
  describe('AgentsLoading', () => {
    it('should render with aria-busy', () => {
      const { container } = render(<AgentsLoading />);
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
    });

    it('should have accessible label', () => {
      const { container } = render(<AgentsLoading />);
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-label', 'Loading agents');
    });

    it('should have sr-only loading text for screen readers', () => {
      render(<AgentsLoading />);
      expect(screen.getByText('Loading agents, please wait...')).toBeInTheDocument();
    });

    it('should render skeleton placeholders', () => {
      const { container } = render(<AgentsLoading />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have aria-hidden on skeleton elements', () => {
      const { container } = render(<AgentsLoading />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('QuickStartLoading', () => {
    it('should render with aria-busy', () => {
      const { container } = render(<QuickStartLoading />);
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
    });

    it('should have accessible label', () => {
      const { container } = render(<QuickStartLoading />);
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-label', 'Loading quick start guide');
    });

    it('should have sr-only loading text', () => {
      render(<QuickStartLoading />);
      expect(screen.getByText('Loading quick start guide, please wait...')).toBeInTheDocument();
    });

    it('should have aria-hidden on skeleton elements', () => {
      const { container } = render(<QuickStartLoading />);
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
