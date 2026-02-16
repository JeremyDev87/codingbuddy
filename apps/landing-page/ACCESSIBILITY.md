# Accessibility Statement

Codingbuddy landing page is committed to WCAG 2.1 Level AA compliance.

## Implemented Features

### Landmarks & Structure

- `<header>` with `aria-label="Site header"`
- `<main>` with `id="main-content"` and locale-specific `lang` attribute
- `<footer>` with `aria-label` (site footer landmark)
- `<nav>` with `aria-label="Main navigation"` (desktop and mobile)
- All `<section>` elements linked via `aria-labelledby` to their headings
- Valid heading hierarchy: single `<h1>`, `<h2>` per section

### Keyboard Navigation

- **Tab**: Move between all interactive elements (links, buttons, dropdowns)
- **Enter/Space**: Activate buttons, expand accordion items
- **Escape**: Close mobile menu, dropdowns
- **Arrow keys**: Navigate dropdown menu items, accordion
- Skip to main content link (visible on focus)
- Visible focus indicators: 2px ring with 2px offset on all interactive elements

### Screen Reader Support

- ARIA labels on all interactive controls (theme toggle, language selector, mobile menu)
- `aria-hidden="true"` on decorative elements (background gradients, icons)
- `aria-live="polite"` on cookie consent dialog for dynamic content announcement
- `role="dialog"` on cookie consent banner
- `role="alert"` on error states
- `aria-busy="true"` on loading skeletons
- Descriptive link labels (e.g., "GitHub - Codingbuddy" instead of just icon)

### Visual Accessibility

- High contrast color scheme using OKLch perceptually uniform color space
- Light and dark mode with sufficient contrast ratios
- `forced-colors` media query support for Windows High Contrast mode
- `prefers-reduced-motion` support: animations disabled for users who prefer reduced motion
- Text remains readable without CSS (semantic HTML structure)

### Internationalization

- 5 languages supported: English, Korean, Japanese, Chinese (Simplified), Spanish
- `lang` attribute set per locale on `<html>`, `<main>`, and all `<section>` elements
- All UI text internationalized (including cookie consent, footer)
- `hreflang` alternates in metadata for SEO and accessibility

## Testing

### Automated

- **axe-core**: Full page accessibility audit in test suite (0 violations)
- **jest-axe**: Component-level accessibility testing
- **@axe-core/react**: Runtime accessibility checks in development
- **Vitest**: 216+ tests including accessibility assertions

### Manual Checklist

- [ ] VoiceOver (macOS): Navigate all sections, verify announcements
- [ ] NVDA (Windows): Navigate all sections, verify announcements
- [ ] Keyboard-only: Complete all interactions without mouse
- [ ] High contrast mode: Verify all content visible
- [ ] 200% zoom: Verify layout remains usable
- [ ] Screen magnification: Verify no content overflow

## Color Contrast

Colors use OKLch color space for perceptually uniform contrast:

| Element                 | Light Mode                              | Dark Mode                                   |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| Body text on background | foreground `oklch(0.145)` on `oklch(1)` | foreground `oklch(0.985)` on `oklch(0.145)` |
| Muted text              | `oklch(0.556)` on `oklch(1)`            | `oklch(0.708)` on `oklch(0.145)`            |
| Primary (links/buttons) | `oklch(0.546)`                          | `oklch(0.623)`                              |

## WCAG 2.1 AA Compliance

| Criterion                    | Status                                                 |
| ---------------------------- | ------------------------------------------------------ |
| 1.1.1 Non-text Content       | Pass (aria-hidden on decorative, labels on functional) |
| 1.3.1 Info and Relationships | Pass (semantic HTML, landmarks, headings)              |
| 1.3.2 Meaningful Sequence    | Pass (logical DOM order)                               |
| 1.4.1 Use of Color           | Pass (not sole means of conveying info)                |
| 1.4.3 Contrast (Minimum)     | Pass (OKLch high-contrast palette)                     |
| 1.4.11 Non-text Contrast     | Pass (focus indicators, borders)                       |
| 2.1.1 Keyboard               | Pass (all interactive elements reachable)              |
| 2.4.1 Bypass Blocks          | Pass (skip to main content link)                       |
| 2.4.2 Page Titled            | Pass (locale-specific titles via generateMetadata)     |
| 2.4.3 Focus Order            | Pass (logical tab order)                               |
| 2.4.6 Headings and Labels    | Pass (descriptive headings, ARIA labels)               |
| 3.1.1 Language of Page       | Pass (lang attribute on html)                          |
| 3.1.2 Language of Parts      | Pass (lang attribute per section)                      |
| 4.1.2 Name, Role, Value      | Pass (ARIA attributes on all controls)                 |

## Reporting Issues

If you encounter accessibility barriers, please open an issue:
https://github.com/JeremyDev87/codingbuddy/issues
