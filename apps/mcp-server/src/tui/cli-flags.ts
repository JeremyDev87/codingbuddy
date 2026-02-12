/**
 * Check if --tui flag is present in process arguments
 */
export function hasTuiFlag(argv: readonly string[]): boolean {
  return argv.includes('--tui');
}
