/**
 * Pure rendering functions for the ContextSection component.
 * Displays decisions[] and notes[] from update_context responses.
 */

/**
 * Format decisions as a numbered list.
 * Returns null when decisions is empty.
 */
export function formatContextDecisions(decisions: string[], maxItems = 5): string | null {
  if (decisions.length === 0) return null;
  const visible = decisions.slice(0, maxItems);
  const lines = visible.map((d, i) => `  ${i + 1}. ${d}`);
  if (decisions.length > maxItems) {
    lines.push(`  ⋯ (+${decisions.length - maxItems} more)`);
  }
  return lines.join('\n');
}

/**
 * Format notes with a bullet prefix.
 * Returns null when notes is empty.
 */
export function formatContextNotes(notes: string[], maxItems = 5): string | null {
  if (notes.length === 0) return null;
  const visible = notes.slice(0, maxItems);
  const lines = visible.map(n => `  › ${n}`);
  if (notes.length > maxItems) {
    lines.push(`  ⋯ (+${notes.length - maxItems} more)`);
  }
  return lines.join('\n');
}

/**
 * Format the combined context section (decisions + notes).
 * Returns null when both are empty.
 */
export function formatContextSection(decisions: string[], notes: string[]): string | null {
  const decStr = formatContextDecisions(decisions);
  const noteStr = formatContextNotes(notes);
  if (!decStr && !noteStr) return null;
  const parts: string[] = [];
  if (decStr) parts.push(decStr);
  if (noteStr) parts.push(noteStr);
  return parts.join('\n');
}
