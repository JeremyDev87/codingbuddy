import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { SocialProof } from '@/widgets/SocialProof';

describe('SocialProof', () => {
  it('should render with locale prop', async () => {
    render(await SocialProof({ locale: 'en' }));
    expect(screen.getByTestId('social-proof')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await SocialProof({ locale: 'ko' }));
    expect(screen.getByTestId('social-proof')).toHaveAttribute('lang', 'ko');
  });

  it('should have aria-label for stats', async () => {
    render(await SocialProof({ locale: 'en' }));
    expect(screen.getByTestId('social-proof')).toHaveAttribute('aria-label', 'Project statistics');
  });

  it('should render all 5 stat items', async () => {
    render(await SocialProof({ locale: 'en' }));
    expect(screen.getByText('37 Agents')).toBeInTheDocument();
    expect(screen.getByText('9 AI Tools')).toBeInTheDocument();
    expect(screen.getByText('50 Skills')).toBeInTheDocument();
    expect(screen.getByText('9 Checklists')).toBeInTheDocument();
    expect(screen.getByText('8 Languages')).toBeInTheDocument();
  });
});
