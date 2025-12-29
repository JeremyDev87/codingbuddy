/**
 * Agent Profile Schema Validation
 *
 * Provides Zod-based validation for agent JSON files with:
 * - Required field validation
 * - Prototype pollution prevention
 * - Type safety
 */

import * as z from 'zod';

// ============================================================================
// Dangerous Keys (Prototype Pollution Prevention)
// ============================================================================

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Recursively check for dangerous keys in an object
 * Uses Object.getOwnPropertyNames to also check non-enumerable properties
 */
function containsDangerousKeys(obj: unknown, path = ''): string | null {
  if (obj === null || typeof obj !== 'object') {
    return null;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = containsDangerousKeys(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  // Use Object.getOwnPropertyNames to catch all properties including non-enumerable
  // Also check with hasOwnProperty for keys like __proto__ that might be special
  const keys = Object.getOwnPropertyNames(obj);

  for (const key of keys) {
    if (DANGEROUS_KEYS.includes(key as (typeof DANGEROUS_KEYS)[number])) {
      return path ? `${path}.${key}` : key;
    }
  }

  // Recursively check nested objects
  for (const key of keys) {
    if (!DANGEROUS_KEYS.includes(key as (typeof DANGEROUS_KEYS)[number])) {
      const result = containsDangerousKeys(
        (obj as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      );
      if (result) return result;
    }
  }

  return null;
}

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
 * Agent Profile schema - validates required fields, allows additional
 */
const AgentProfileSchema = z
  .object({
    name: z.string(),
    description: z.string(),
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
