const FILLED_CHAR = '█';
const EMPTY_CHAR = '░';

export function clampValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function buildProgressBar(value: number, width: number): string {
  const safeWidth = Math.max(0, Math.floor(width));
  if (safeWidth === 0) return '';
  const clamped = clampValue(value);
  const filledCount = Math.round((clamped / 100) * safeWidth);
  const emptyCount = safeWidth - filledCount;
  return FILLED_CHAR.repeat(filledCount) + EMPTY_CHAR.repeat(emptyCount);
}
