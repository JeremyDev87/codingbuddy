import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '@/widgets/AgentsShowcase/ui/FilterBar';

const defaultTranslations = {
  filter: 'Filter by category',
  search: 'Search agents...',
  allCategories: 'All Categories',
  categories: {
    Planning: 'Planning',
    Development: 'Development',
    Review: 'Review',
    Security: 'Security',
    UX: 'UX',
  } as const,
};

describe('FilterBar', () => {
  it('should render search input with placeholder', () => {
    render(
      <FilterBar
        category="all"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        translations={defaultTranslations}
      />,
    );
    expect(screen.getByPlaceholderText('Search agents...')).toBeInTheDocument();
  });

  it('should render search input with aria-label', () => {
    render(
      <FilterBar
        category="all"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        translations={defaultTranslations}
      />,
    );
    expect(screen.getByLabelText('Search agents...')).toBeInTheDocument();
  });

  it('should render select with aria-label', () => {
    render(
      <FilterBar
        category="all"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        translations={defaultTranslations}
      />,
    );
    expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterBar
        category="all"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
        translations={defaultTranslations}
      />,
    );

    const input = screen.getByPlaceholderText('Search agents...');
    await user.type(input, 'test');

    expect(onSearchChange).toHaveBeenCalled();
  });

  it('should display current search query value', () => {
    render(
      <FilterBar
        category="all"
        onCategoryChange={vi.fn()}
        searchQuery="frontend"
        onSearchChange={vi.fn()}
        translations={defaultTranslations}
      />,
    );
    expect(screen.getByDisplayValue('frontend')).toBeInTheDocument();
  });
});
