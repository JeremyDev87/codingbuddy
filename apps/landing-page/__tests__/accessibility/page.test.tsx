import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { run } from 'axe-core';
import Home from '../../src/app/page';

describe('Home Page Accessibility', () => {
  test('should have no axe violations', async () => {
    const { container } = render(<Home />);
    const results = await run(container);

    expect(results.violations).toHaveLength(0);
  });

  test('all links have accessible names', () => {
    const { getAllByRole } = render(<Home />);
    const links = getAllByRole('link');

    links.forEach(link => {
      expect(link).toHaveAccessibleName();
    });

    expect(links.length).toBeGreaterThan(0);
  });

  test('main landmark exists with correct id', () => {
    const { getByRole } = render(<Home />);
    const main = getByRole('main');

    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  test('heading hierarchy is valid', () => {
    const { container } = render(<Home />);
    const h1 = container.querySelector('h1');
    const h2 = container.querySelector('h2');

    expect(h1).toBeInTheDocument();
    expect(h2).toBeInTheDocument();
  });

  test('decorative images are hidden from screen readers', () => {
    const { container } = render(<Home />);
    const images = container.querySelectorAll('img[aria-hidden="true"]');

    // Logo images should be decorative
    expect(images.length).toBeGreaterThan(0);
  });

  test('navigation landmark exists', () => {
    const { getByRole } = render(<Home />);
    const nav = getByRole('navigation', { name: /primary actions/i });

    expect(nav).toBeInTheDocument();
  });

  test('header landmark exists', () => {
    const { container } = render(<Home />);
    const header = container.querySelector('header');

    expect(header).toBeInTheDocument();
  });

  test('external links have proper security attributes', () => {
    const { getAllByRole } = render(<Home />);
    const externalLinks = getAllByRole('link').filter(
      link => link.getAttribute('target') === '_blank',
    );

    externalLinks.forEach(link => {
      const rel = link.getAttribute('rel') || '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });
  });
});
