export const MINI_CARD_NAME_MAX = 18;
const ELLIPSIS = '\u2026';

export function getMiniCardBorderColor(isActive: boolean): string {
  return isActive ? 'cyan' : 'gray';
}

export function getMiniCardTextDimmed(isActive: boolean): boolean {
  return !isActive;
}

export function abbreviateMiniName(name: string): string {
  if (name.length <= MINI_CARD_NAME_MAX) return name;
  return name.slice(0, MINI_CARD_NAME_MAX - 1) + ELLIPSIS;
}
