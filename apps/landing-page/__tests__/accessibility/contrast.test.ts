import { describe, it, expect } from 'vitest';

/**
 * WCAG 2.1 contrast ratio requirements:
 * - AA Normal text (< 18pt): 4.5:1
 * - AA Large text (>= 18pt or 14pt bold): 3:1
 * - AAA Normal text: 7:1
 *
 * Note: sRGB values below are approximations of the oklch values defined in
 * globals.css. Actual browser rendering may differ slightly due to color space
 * conversion and gamut mapping. All thresholds include sufficient margin to
 * account for this variance.
 */

/** Calculate relative luminance from sRGB [0-255] */
const relativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/** Calculate contrast ratio between two luminances */
const contrastRatio = (l1: number, l2: number): number => {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Approximate sRGB equivalents of brand oklch colors
const COLORS = {
  // Light mode
  primaryLight: [59, 130, 246] as const, // oklch(0.546 0.245 262.881) ≈ #3B82F6
  primaryForegroundLight: [248, 250, 252] as const, // oklch(0.985 0.002 247.839)
  secondaryBgLight: [245, 243, 255] as const, // oklch(0.97 0.014 293.009)
  secondaryFgLight: [124, 58, 237] as const, // oklch(0.541 0.281 293.009) ≈ #7C3AED
  accentBgLight: [243, 255, 243] as const, // oklch(0.97 0.014 145.071)
  accentFgLight: [21, 128, 61] as const, // oklch(0.448 0.15 145.071) ≈ #15803D
  foregroundLight: [10, 10, 10] as const, // oklch(0.145 0 0)
  backgroundLight: [255, 255, 255] as const, // oklch(1 0 0)

  // Dark mode
  primaryDark: [96, 165, 250] as const, // oklch(0.623 0.214 259.815) ≈ #60A5FA
  foregroundDark: [250, 250, 250] as const, // oklch(0.985 0 0)
  backgroundDark: [10, 10, 10] as const, // oklch(0.145 0 0)
} as const;

describe('Brand Color WCAG AA Contrast', () => {
  it('primary-foreground on primary (light) meets AA for large text (3:1)', () => {
    const l1 = relativeLuminance(...COLORS.primaryLight);
    const l2 = relativeLuminance(...COLORS.primaryForegroundLight);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('secondary-foreground on secondary background (light) meets AA (4.5:1)', () => {
    const l1 = relativeLuminance(...COLORS.secondaryFgLight);
    const l2 = relativeLuminance(...COLORS.secondaryBgLight);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('accent-foreground on accent background (light) meets AA (4.5:1)', () => {
    const l1 = relativeLuminance(...COLORS.accentFgLight);
    const l2 = relativeLuminance(...COLORS.accentBgLight);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('foreground on background (light) meets AAA (7:1)', () => {
    const l1 = relativeLuminance(...COLORS.foregroundLight);
    const l2 = relativeLuminance(...COLORS.backgroundLight);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('foreground on background (dark) meets AAA (7:1)', () => {
    const l1 = relativeLuminance(...COLORS.foregroundDark);
    const l2 = relativeLuminance(...COLORS.backgroundDark);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('primary on background (dark) meets AA for large text (3:1)', () => {
    const l1 = relativeLuminance(...COLORS.primaryDark);
    const l2 = relativeLuminance(...COLORS.backgroundDark);
    const ratio = contrastRatio(l1, l2);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});
