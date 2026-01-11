/**
 * Test Strategy Prompt
 *
 * Interactive CLI prompts for test strategy settings
 */

import { select, input } from '@inquirer/prompts';

/**
 * Choice option
 */
export interface TestChoice<T = string> {
  name: string;
  value: T;
  description?: string;
}

/**
 * Test strategy settings collected from user
 */
export interface TestStrategySettings {
  approach: 'tdd' | 'bdd' | 'test-after' | 'mixed';
  coverage: number;
  mockingStrategy: 'minimal' | 'extensive' | 'no-mocks';
}

/**
 * Default test coverage target
 */
export const DEFAULT_COVERAGE = 90;

/**
 * Validate coverage input value
 * @param value - Input value to validate
 * @returns true if valid, error message string if invalid
 */
export function validateCoverage(value: string): true | string {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > 100) {
    return 'Please enter a number between 0 and 100';
  }
  return true;
}

/**
 * Test approach choices
 */
export const APPROACH_CHOICES: TestChoice<TestStrategySettings['approach']>[] =
  [
    {
      name: 'TDD (Test-Driven Development)',
      value: 'tdd',
      description: 'Write tests first, then implement',
    },
    {
      name: 'BDD (Behavior-Driven Development)',
      value: 'bdd',
      description: 'Focus on behavior specifications',
    },
    {
      name: 'Test-After',
      value: 'test-after',
      description: 'Write tests after implementation',
    },
    {
      name: 'Mixed',
      value: 'mixed',
      description: 'TDD for core logic, test-after for UI',
    },
  ];

/**
 * Mocking strategy choices
 */
export const MOCKING_STRATEGY_CHOICES: TestChoice<
  TestStrategySettings['mockingStrategy']
>[] = [
  {
    name: 'Minimal',
    value: 'minimal',
    description: 'Mock only external services (recommended)',
  },
  {
    name: 'Extensive',
    value: 'extensive',
    description: 'Mock most dependencies',
  },
  {
    name: 'No Mocks',
    value: 'no-mocks',
    description: 'Integration tests with real implementations',
  },
];

/**
 * Options for test strategy prompt
 */
export interface TestStrategyPromptOptions {
  /** Detected test approach */
  detectedApproach?: TestStrategySettings['approach'];
  /** Detected coverage target */
  detectedCoverage?: number;
  /** Detected mocking strategy */
  detectedMockingStrategy?: TestStrategySettings['mockingStrategy'];
}

/**
 * Prompt user for test strategy settings
 */
export async function promptTestStrategySettings(
  options: TestStrategyPromptOptions = {},
): Promise<TestStrategySettings> {
  const approach = await select({
    message: 'Select test approach:',
    choices: APPROACH_CHOICES,
    default: options.detectedApproach ?? 'tdd',
  });

  const coverageInput = await input({
    message: 'Target test coverage (%):',
    default: String(options.detectedCoverage ?? DEFAULT_COVERAGE),
    validate: validateCoverage,
  });
  const coverage = parseInt(coverageInput, 10);

  const mockingStrategy = await select({
    message: 'Select mocking strategy:',
    choices: MOCKING_STRATEGY_CHOICES,
    default: options.detectedMockingStrategy ?? 'minimal',
  });

  return {
    approach,
    coverage,
    mockingStrategy,
  };
}
