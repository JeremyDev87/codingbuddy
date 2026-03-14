import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '@/widgets/AgentsShowcase/ui/FilterBar';

const defaultTranslations = {
  filter: 'Filter by category',
  allCategories: 'All',
  categories: {
    Planning: 'Planning',
    Development: 'Development',
    Review: 'Review',
    Security: 'Security',
    UX: 'UX',
  } as const,
};

describe('FilterBar', () => {
  it('should render category buttons as a button group', () => {
    render(
      <FilterBar category="all" onCategoryChange={vi.fn()} translations={defaultTranslations} />,
    );
    expect(screen.getByRole('group', { name: 'Filter by category' })).toBeInTheDocument();
  });

  it('should render All button and all category buttons', () => {
    render(
      <FilterBar category="all" onCategoryChange={vi.fn()} translations={defaultTranslations} />,
    );
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Development' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UX' })).toBeInTheDocument();
  });

  it('should mark selected category button as pressed', () => {
    render(
      <FilterBar
        category="Development"
        onCategoryChange={vi.fn()}
        translations={defaultTranslations}
      />,
    );
    expect(screen.getByRole('button', { name: 'Development' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('should call onCategoryChange when a category button is clicked', async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterBar
        category="all"
        onCategoryChange={onCategoryChange}
        translations={defaultTranslations}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Security' }));

    expect(onCategoryChange).toHaveBeenCalledWith('Security');
  });

  it('should not render a search input', () => {
    render(
      <FilterBar category="all" onCategoryChange={vi.fn()} translations={defaultTranslations} />,
    );
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
