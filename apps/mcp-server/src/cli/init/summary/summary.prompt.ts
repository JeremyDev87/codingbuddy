/**
 * Summary Prompt
 *
 * Interactive CLI prompt for summary actions (confirm, edit, cancel)
 */

import { select } from '@inquirer/prompts';

/**
 * Available summary actions
 */
export type SummaryAction =
  | 'confirm'
  | 'edit-basic'
  | 'edit-tech-stack'
  | 'edit-architecture'
  | 'edit-conventions'
  | 'edit-test-strategy'
  | 'edit-ai'
  | 'cancel';

/**
 * Choice option for summary actions
 */
export interface SummaryChoice {
  name: string;
  value: SummaryAction;
}

/**
 * Summary action choices
 *
 * Each choice name starts with a text label in brackets for screen reader accessibility.
 * Format: "[ActionType] emoji description"
 *
 * Edit options have specific prefixes for better accessibility and differentiation:
 * - [Edit Basic] for basic project settings
 * - [Edit Tech] for tech stack configuration
 * - [Edit Arch] for architecture settings
 * - [Edit Conv] for coding conventions
 * - [Edit Test] for test strategy settings
 * - [Edit AI] for AI configuration
 */
export const SUMMARY_ACTION_CHOICES: SummaryChoice[] = [
  { name: '[Confirm] ✅ Confirm and generate config', value: 'confirm' },
  { name: '[Edit Basic] ✏️  Edit Basic settings', value: 'edit-basic' },
  { name: '[Edit Tech] ✏️  Edit Tech Stack', value: 'edit-tech-stack' },
  { name: '[Edit Arch] ✏️  Edit Architecture', value: 'edit-architecture' },
  { name: '[Edit Conv] ✏️  Edit Conventions', value: 'edit-conventions' },
  { name: '[Edit Test] ✏️  Edit Test Strategy', value: 'edit-test-strategy' },
  { name: '[Edit AI] ✏️  Edit AI settings', value: 'edit-ai' },
  { name: '[Cancel] ❌ Cancel', value: 'cancel' },
];

/**
 * Prompt user for summary action
 */
export async function promptSummaryAction(): Promise<SummaryAction> {
  return select({
    message: 'What would you like to do?',
    choices: SUMMARY_ACTION_CHOICES,
  });
}
