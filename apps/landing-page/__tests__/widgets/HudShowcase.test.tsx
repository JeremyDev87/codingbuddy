import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-server-mock';
import { HudShowcase } from '@/widgets/HudShowcase';

describe('HudShowcase', () => {
  it('should render with locale prop', async () => {
    render(await HudShowcase({ locale: 'en' }));
    expect(screen.getByTestId('hud-showcase')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', async () => {
    render(await HudShowcase({ locale: 'ko' }));
    expect(screen.getByTestId('hud-showcase')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', async () => {
    render(await HudShowcase({ locale: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Intelligence at a Glance');
  });

  it('should have aria-labelledby linking to heading', async () => {
    render(await HudShowcase({ locale: 'en' }));
    expect(screen.getByTestId('hud-showcase')).toHaveAttribute(
      'aria-labelledby',
      'hud-showcase-heading',
    );
  });

  it('should render simulated HUD statusbar with all segments', async () => {
    render(await HudShowcase({ locale: 'en' }));
    expect(screen.getByText('buddy')).toBeInTheDocument();
    expect(screen.getByText('PLAN')).toBeInTheDocument();
    expect(screen.getByText('$0.47 saved')).toBeInTheDocument();
  });

  it('should render all 5 feature cards', async () => {
    render(await HudShowcase({ locale: 'en' }));
    expect(screen.getByText('Breathing Buddy')).toBeInTheDocument();
    expect(screen.getByText('Cost Velocity')).toBeInTheDocument();
    expect(screen.getByText('Cache Savings')).toBeInTheDocument();
    expect(screen.getByText('Mode Rainbow')).toBeInTheDocument();
    expect(screen.getByText('Context Bar')).toBeInTheDocument();
  });
});
