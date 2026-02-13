export function buildCategoryLabel(icon: string, categoryName: string): string {
  return icon ? `${icon} ${categoryName}` : categoryName;
}
