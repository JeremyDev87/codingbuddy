/**
 * Skill Schema Validation
 *
 * Provides Zod-based validation for SKILL.md files with:
 * - YAML frontmatter parsing
 * - Required field validation
 * - Prototype pollution prevention
 * - Type safety
 */

import * as z from 'zod';
import * as yaml from 'yaml';
import { containsDangerousKeys } from '../shared/security.utils';

// ============================================================================
// Custom Error
// ============================================================================

export class SkillSchemaError extends Error {
  constructor(
    message: string,
    public readonly details?: z.ZodError,
  ) {
    super(message);
    this.name = 'SkillSchemaError';
  }
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Trigger entry schema for SKILL.md frontmatter
 * - pattern: regex pattern string (non-empty)
 * - confidence: high | medium | low
 */
const SkillFrontmatterTriggerSchema = z.object({
  pattern: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
});

/**
 * Skill frontmatter schema
 * - name: lowercase with hyphens only (a-z0-9-)
 * - description: 1-500 characters
 * - triggers: optional array of pattern+confidence entries
 */
const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Skill name must be lowercase alphanumeric with hyphens only'),
  description: z.string().min(1).max(500),
  triggers: z.array(SkillFrontmatterTriggerSchema).optional(),
  'user-invocable': z.boolean().optional(),
  'disable-model-invocation': z.boolean().optional(),
  context: z.string().optional(),
  agent: z.string().optional(),
  'allowed-tools': z.array(z.string()).optional(),
});

// ============================================================================
// Types
// ============================================================================

export interface SkillFrontmatterTrigger {
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  triggers?: SkillFrontmatterTrigger[];
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  context?: string;
  agent?: string;
  allowedTools?: string[];
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(content: string): {
  frontmatter: unknown;
  body: string;
} {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    throw new SkillSchemaError('Invalid skill file: Missing or malformed YAML frontmatter');
  }

  const [, yamlStr, body] = match;

  try {
    const frontmatter = yaml.parse(yamlStr);
    return { frontmatter, body: body.trim() };
  } catch (error) {
    throw new SkillSchemaError(
      `Invalid skill file: YAML parsing failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse and validate a skill from SKILL.md content
 *
 * @param content - Raw file content with YAML frontmatter
 * @param filePath - Path to the skill file (for reference)
 * @returns Validated skill object
 * @throws SkillSchemaError if validation fails
 */
export function parseSkill(content: string, filePath: string): Skill {
  // Parse frontmatter
  const { frontmatter, body } = parseFrontmatter(content);

  // Check for prototype pollution
  const dangerousKey = containsDangerousKeys(frontmatter);
  if (dangerousKey) {
    throw new SkillSchemaError(`Invalid skill: Dangerous key "${dangerousKey}" detected`);
  }

  // Validate frontmatter with Zod
  const result = SkillFrontmatterSchema.safeParse(frontmatter);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map(issue => {
        const pathStr = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${pathStr}: ${issue.message}`;
      })
      .join(', ');
    throw new SkillSchemaError(`Invalid skill frontmatter: ${errorMessage}`, result.error);
  }

  // Validate content is not empty
  if (!body || body.trim().length === 0) {
    throw new SkillSchemaError('Invalid skill: Content after frontmatter is empty');
  }

  return {
    name: result.data.name,
    description: result.data.description,
    content: body,
    path: filePath,
    triggers: result.data.triggers,
    userInvocable: result.data['user-invocable'],
    disableModelInvocation: result.data['disable-model-invocation'],
    context: result.data.context,
    agent: result.data.agent,
    allowedTools: result.data['allowed-tools'],
  };
}
