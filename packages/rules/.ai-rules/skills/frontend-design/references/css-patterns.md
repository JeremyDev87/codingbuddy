# CSS Design Patterns Reference

Reusable CSS patterns for building distinctive, production-grade interfaces. These patterns avoid generic "AI slop" aesthetics and prioritize intentional design choices.

## Typography Systems

### Font Pairing Strategy

```css
/* Display + Body pairing — choose contrast, not similarity */
:root {
  --font-display: 'Playfair Display', serif;      /* Headlines: high personality */
  --font-body: 'Source Sans 3', sans-serif;        /* Body: high readability */
  --font-mono: 'JetBrains Mono', monospace;        /* Code: developer-friendly */
}

/* Typographic scale (Major Third — ratio 1.25) */
:root {
  --text-xs:  0.64rem;   /* 10.24px */
  --text-sm:  0.8rem;    /* 12.8px  */
  --text-base: 1rem;     /* 16px    */
  --text-md:  1.25rem;   /* 20px    */
  --text-lg:  1.563rem;  /* 25px    */
  --text-xl:  1.953rem;  /* 31.25px */
  --text-2xl: 2.441rem;  /* 39px    */
  --text-3xl: 3.052rem;  /* 48.83px */
}
```

### Fluid Typography

```css
/* Responsive type that scales smoothly between breakpoints */
h1 {
  font-size: clamp(2rem, 1rem + 3vw, 4rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

p {
  font-size: clamp(1rem, 0.9rem + 0.25vw, 1.125rem);
  line-height: 1.65;
  max-width: 65ch; /* Optimal reading width */
}
```

## Color Systems

### HSL-Based Theme Tokens

```css
/* HSL gives intuitive control over lightness/saturation variants */
:root {
  --hue-primary: 230;
  --hue-accent: 350;

  --color-primary: hsl(var(--hue-primary), 65%, 50%);
  --color-primary-light: hsl(var(--hue-primary), 65%, 95%);
  --color-primary-dark: hsl(var(--hue-primary), 65%, 30%);

  --color-accent: hsl(var(--hue-accent), 80%, 55%);

  --color-surface: hsl(0, 0%, 100%);
  --color-surface-raised: hsl(0, 0%, 98%);
  --color-text: hsl(0, 0%, 12%);
  --color-text-muted: hsl(0, 0%, 45%);
}

/* Dark mode — adjust lightness, not hue */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: hsl(var(--hue-primary), 70%, 65%);
    --color-surface: hsl(0, 0%, 8%);
    --color-surface-raised: hsl(0, 0%, 14%);
    --color-text: hsl(0, 0%, 92%);
    --color-text-muted: hsl(0, 0%, 60%);
  }
}
```

## Layout Patterns

### Asymmetric Grid

```css
/* Break the 12-column monotony */
.asymmetric-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: clamp(1.5rem, 3vw, 4rem);
}

/* Overlap elements for depth */
.overlap-layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}
.overlap-layout > .primary {
  grid-column: 1 / 9;
  grid-row: 1;
}
.overlap-layout > .accent {
  grid-column: 7 / 13;
  grid-row: 1;
  margin-top: 4rem; /* Intentional offset */
  z-index: 1;
}
```

### Container Queries

```css
/* Component-level responsive design */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { flex-direction: row; }
  .card__image { width: 40%; }
}

@container card (min-width: 700px) {
  .card { gap: 2rem; }
  .card__image { width: 50%; }
}
```

## Motion & Animation

### Staggered Reveal

```css
/* Page load animation with staggered children */
@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(1.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-reveal > * {
  opacity: 0;
  animation: reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.stagger-reveal > *:nth-child(1) { animation-delay: 0.1s; }
.stagger-reveal > *:nth-child(2) { animation-delay: 0.2s; }
.stagger-reveal > *:nth-child(3) { animation-delay: 0.3s; }
.stagger-reveal > *:nth-child(4) { animation-delay: 0.4s; }
```

### Hover Interactions

```css
/* Magnetic lift with shadow depth */
.interactive-card {
  transition:
    transform 0.25s cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 0.25s ease;
}

.interactive-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.06),
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 20px 25px -5px rgba(0, 0, 0, 0.04);
}

.interactive-card:active {
  transform: translateY(-1px);
  transition-duration: 0.1s;
}
```

## Background & Texture

### Gradient Mesh

```css
/* Multi-stop gradient for organic feel */
.gradient-mesh {
  background:
    radial-gradient(ellipse at 20% 50%, hsla(200, 80%, 70%, 0.3), transparent 50%),
    radial-gradient(ellipse at 80% 20%, hsla(340, 80%, 70%, 0.2), transparent 50%),
    radial-gradient(ellipse at 50% 80%, hsla(260, 60%, 60%, 0.25), transparent 50%),
    hsl(0, 0%, 98%);
}
```

### Noise Texture Overlay

```css
/* Subtle grain for depth — use a tiny noise PNG or SVG data URI */
.grain-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}
```

## Utility Patterns

### Accessible Focus Styles

```css
/* Visible focus ring that works on any background */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 2px;
}

/* Remove default outline only when :focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Scroll-Triggered Animations

```css
/* Native CSS scroll-driven animations (modern browsers) */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(2rem); }
  to   { opacity: 1; transform: translateY(0); }
}

.scroll-reveal {
  animation: fade-in-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}
```
