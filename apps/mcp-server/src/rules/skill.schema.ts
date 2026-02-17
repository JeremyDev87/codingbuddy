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
 * Skill frontmatter schema
 * - name: lowercase with hyphens only (a-z0-9-)
 * - description: 1-500 characters
 */
const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Skill name must be lowercase alphanumeric with hyphens only'),
  description: z.string().min(1).max(500),
});

// ============================================================================
// Types
// ============================================================================

export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
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
  };
}
