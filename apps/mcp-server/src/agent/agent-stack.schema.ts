import * as z from 'zod';

/**
 * Zod schema for AgentStack validation.
 *
 * Validates agent stack JSON files with required fields
 * and optional recommended_for configuration.
 */
export const AgentStackSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  primary_agent: z.string(),
  specialist_agents: z.array(z.string()),
  recommended_for: z
    .object({
      file_patterns: z.array(z.string()).optional(),
      modes: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ValidatedAgentStack = z.infer<typeof AgentStackSchema>;
