/**
 * Agent Profile Schema Validation
 *
 * Provides Zod-based validation for agent JSON files with:
 * - Required field validation
 * - Prototype pollution prevention
 * - Type safety
 */

import * as z from 'zod';
import { containsDangerousKeys } from '../shared/security.utils';

// ============================================================================
// Custom Error
// ============================================================================

export class AgentSchemaError extends Error {
  constructor(
    message: string,
    public readonly details?: z.ZodError,
  ) {
    super(message);
    this.name = 'AgentSchemaError';
  }
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Role schema - required fields for agent role
 */
const RoleSchema = z
  .object({
    title: z.string(),
    expertise: z.array(z.string()),
    tech_stack_reference: z.string().optional(),
    responsibilities: z.array(z.string()).optional(),
  })
  .passthrough();

/**
 * Model configuration schema - optional model preferences
 */
const ModelConfigSchema = z
  .object({
    preferred: z.string(),
    reason: z.string().optional(),
  })
  .optional();

/**
 * Agent Profile schema - validates required fields, allows additional
 */
const AgentProfileSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    model: ModelConfigSchema,
    role: RoleSchema,
  })
  .passthrough();

// ============================================================================
// Types
// ============================================================================

export type ValidatedAgentProfile = z.infer<typeof AgentProfileSchema> & {
  [key: string]: unknown;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse and validate an agent profile from unknown input
 *
 * @param data - Unknown data to parse
 * @returns Validated agent profile
 * @throws AgentSchemaError if validation fails or dangerous keys detected
 */
export function parseAgentProfile(data: unknown): ValidatedAgentProfile {
  try {
    // Check for prototype pollution attempts
    const dangerousKey = containsDangerousKeys(data);
    if (dangerousKey) {
      throw new AgentSchemaError(
        `Invalid agent profile: Dangerous key "${dangerousKey}" detected`,
      );
    }

    // Validate with Zod
    const result = AgentProfileSchema.safeParse(data);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map(issue => {
          const pathStr = issue.path.length > 0 ? issue.path.join('.') : 'root';
          return `${pathStr}: ${issue.message}`;
        })
        .join(', ');
      throw new AgentSchemaError(
        `Invalid agent profile: ${errorMessage}`,
        result.error,
      );
    }

    return result.data as ValidatedAgentProfile;
  } catch (error) {
    // Re-throw AgentSchemaError as-is
    if (error instanceof AgentSchemaError) {
      throw error;
    }
    // Wrap unexpected errors
    throw new AgentSchemaError(
      `Invalid agent profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
