/**
 * Config Generator
 *
 * Uses AI to generate CodingBuddy configuration from project analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProjectAnalysis } from '../../analyzer';
import type { CodingBuddyConfig } from '../../config';
import { validateConfig } from '../../config/config.schema';
import { buildSystemPrompt, buildAnalysisPrompt } from './prompt.builder';

/**
 * Config generator options
 */
export interface ConfigGeneratorOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Max tokens for response */
  maxTokens?: number;
}

/**
 * Default model for config generation
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Default max tokens
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Extract JSON from AI response that may contain markdown or extra text
 */
export function extractJsonFromResponse(response: string): string | null {
  // Try to extract from markdown code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Parse and validate JSON response from AI
 */
export function parseJsonResponse(response: string): CodingBuddyConfig {
  const jsonString = extractJsonFromResponse(response);

  if (!jsonString) {
    throw new Error('No valid JSON found in response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(
      `Invalid JSON in response: ${jsonString.substring(0, 100)}...`,
    );
  }

  // Validate against schema
  const validation = validateConfig(parsed);

  if (!validation.success) {
    // Even if validation fails, return what we can parse
    // Schema validation is lenient (all fields optional)
    console.warn('Config validation warnings:', validation.errors);
  }

  return validation.data ?? (parsed as CodingBuddyConfig);
}

/**
 * AI-powered config generator
 */
export class ConfigGenerator {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(options: ConfigGeneratorOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
    });
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  /**
   * Generate configuration from project analysis
   */
  async generate(analysis: ProjectAnalysis): Promise<CodingBuddyConfig> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildAnalysisPrompt(analysis);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in AI response');
    }

    return parseJsonResponse(textContent.text);
  }
}
