/**
 * CLI Prompts Module
 *
 * Interactive prompts for CLI commands
 */

// Model prompt
export {
  getModelChoices,
  promptModelSelection,
  DEFAULT_MODEL_CHOICE,
} from './model-prompt';
export type { ModelChoice } from './model-prompt';

// Language prompt
export {
  getLanguageChoices,
  promptLanguageSelection,
  DEFAULT_LANGUAGE,
} from './language-prompt';
export type { LanguageChoice } from './language-prompt';

// Agent prompt
export {
  getPrimaryAgentChoices,
  promptPrimaryAgentSelection,
  DEFAULT_PRIMARY_AGENT,
} from './agent-prompt';
export type { AgentChoice } from './agent-prompt';
export type { ActPrimaryAgent } from '../../../keyword/keyword.types';

// Basic prompt (project name, description)
export {
  promptBasicSettings,
  validateProjectName,
  validateDescription,
  DEFAULT_PROJECT_NAME,
  DEFAULT_DESCRIPTION,
} from './basic-prompt';
export type { BasicSettings, BasicPromptOptions } from './basic-prompt';

// Tech stack prompt
export {
  promptTechStackSettings,
  LANGUAGE_CHOICES,
  FRONTEND_CHOICES,
  BACKEND_CHOICES,
  TOOL_CHOICES,
} from './tech-stack-prompt';
export type {
  TechStackSettings,
  TechStackPromptOptions,
  StackChoice,
} from './tech-stack-prompt';

// Architecture prompt
export {
  promptArchitectureSettings,
  PATTERN_CHOICES,
  COMPONENT_STYLE_CHOICES,
} from './architecture-prompt';
export type {
  ArchitectureSettings,
  ArchitecturePromptOptions,
  ArchChoice,
} from './architecture-prompt';

// Conventions prompt
export {
  promptConventionsSettings,
  FILE_NAMING_CHOICES,
  QUOTES_CHOICES,
  SEMICOLONS_CHOICES,
} from './conventions-prompt';
export type {
  ConventionsSettings,
  ConventionsPromptOptions,
  ConvChoice,
} from './conventions-prompt';

// Test strategy prompt
export {
  promptTestStrategySettings,
  APPROACH_CHOICES,
  MOCKING_STRATEGY_CHOICES,
  DEFAULT_COVERAGE,
} from './test-strategy-prompt';
export type {
  TestStrategySettings,
  TestStrategyPromptOptions,
  TestChoice,
} from './test-strategy-prompt';
