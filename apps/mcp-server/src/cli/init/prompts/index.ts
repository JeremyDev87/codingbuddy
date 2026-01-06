/**
 * CLI Prompts Module
 *
 * Interactive prompts for CLI commands
 */

export {
  getModelChoices,
  promptModelSelection,
  DEFAULT_MODEL_CHOICE,
} from './model-prompt';

export type { ModelChoice } from './model-prompt';

export {
  getLanguageChoices,
  promptLanguageSelection,
  DEFAULT_LANGUAGE,
} from './language-prompt';

export type { LanguageChoice } from './language-prompt';

export {
  getPrimaryAgentChoices,
  promptPrimaryAgentSelection,
  DEFAULT_PRIMARY_AGENT,
} from './agent-prompt';

export type { AgentChoice } from './agent-prompt';
export type { ActPrimaryAgent } from '../../../keyword/keyword.types';
