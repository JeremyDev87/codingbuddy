/**
 * Summary Module
 *
 * Exports summary renderer and prompt
 */

export {
  renderConfigSummary,
  type ConfigSummaryData,
} from './summary.renderer';

export {
  promptSummaryAction,
  SUMMARY_ACTION_CHOICES,
  type SummaryAction,
  type SummaryChoice,
} from './summary.prompt';
