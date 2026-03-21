/**
 * Distinctive React Component Template
 *
 * This template demonstrates a production-grade React component
 * with intentional design choices that avoid generic AI aesthetics.
 *
 * Key patterns:
 * - CSS variables for theming consistency
 * - Staggered reveal animations
 * - Fluid typography with clamp()
 * - Accessible focus management
 * - Motion library integration (optional)
 */

import { type ReactNode, type HTMLAttributes, forwardRef } from 'react';

// ─── Types ───────────────────────────────────────────────

interface FeatureCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card title — displayed as the main heading */
  title: string;
  /** Supporting description text */
  description: string;
  /** Icon or visual element displayed above the title */
  icon?: ReactNode;
  /** Visual variant controlling the color scheme */
  variant?: 'default' | 'accent' | 'muted';
  /** Stagger delay index for entrance animation (0-based) */
  staggerIndex?: number;
}

// ─── Component ───────────────────────────────────────────

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  function FeatureCard(
    {
      title,
      description,
      icon,
      variant = 'default',
      staggerIndex = 0,
      className = '',
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={`feature-card feature-card--${variant} ${className}`}
        style={{
          '--stagger-delay': `${staggerIndex * 0.1}s`,
          ...style,
        } as React.CSSProperties}
        {...rest}
      >
        {icon && <div className="feature-card__icon">{icon}</div>}
        <h3 className="feature-card__title">{title}</h3>
        <p className="feature-card__description">{description}</p>
      </div>
    );
  },
);

// ─── Styles (CSS Module or global stylesheet) ────────────

/*
Use a separate .module.css file in production. Inline styles shown
here for template completeness.

.feature-card {
  --card-bg: var(--color-surface-raised, hsl(0 0% 98%));
  --card-border: var(--color-border, hsl(0 0% 90%));
  --card-radius: 1rem;

  position: relative;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);

  /* Staggered entrance animation */
  opacity: 0;
  animation: card-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--stagger-delay);

  /* Hover interaction */
  transition:
    transform 0.25s cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary, hsl(230 65% 50%));
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.07);
}

.feature-card:active {
  transform: translateY(-1px);
  transition-duration: 0.1s;
}

.feature-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

/* --- Variants --- */

.feature-card--accent {
  --card-bg: hsl(var(--hue-accent, 350) 80% 97%);
  --card-border: hsl(var(--hue-accent, 350) 60% 85%);
}

.feature-card--muted {
  --card-bg: hsl(0 0% 96%);
  --card-border: transparent;
}

/* --- Children --- */

.feature-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  border-radius: 0.75rem;
  background: var(--color-primary-light, hsl(230 65% 95%));
  color: var(--color-primary, hsl(230 65% 50%));
  font-size: 1.25rem;
}

.feature-card__title {
  margin: 0 0 0.5rem;
  font-family: var(--font-display, 'Playfair Display', serif);
  font-size: clamp(1.125rem, 0.9rem + 0.5vw, 1.375rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--color-text, hsl(0 0% 12%));
}

.feature-card__description {
  margin: 0;
  font-family: var(--font-body, 'Source Sans 3', sans-serif);
  font-size: var(--text-base, 1rem);
  line-height: 1.6;
  color: var(--color-text-muted, hsl(0 0% 45%));
}

/* --- Animation --- */

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(1.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card {
    animation: none;
    opacity: 1;
  }
  .feature-card:hover {
    transform: none;
  }
}
*/

// ─── Usage Example ───────────────────────────────────────

/*
import { FeatureCard } from './FeatureCard';
import { Zap, Shield, Palette } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    { icon: <Zap />, title: 'Lightning Fast', description: 'Sub-100ms response times.' },
    { icon: <Shield />, title: 'Secure by Default', description: 'Zero-trust architecture.' },
    { icon: <Palette />, title: 'Fully Themeable', description: 'CSS variable driven.' },
  ];

  return (
    <section className="features-grid">
      {features.map((f, i) => (
        <FeatureCard key={f.title} {...f} staggerIndex={i} />
      ))}
    </section>
  );
}
*/
