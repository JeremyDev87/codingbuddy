/**
 * Primary Agent Selection Prompt
 *
 * Interactive CLI prompt for primary development agent selection
 */

import { select } from '@inquirer/prompts';
import {
  ACT_PRIMARY_AGENTS,
  DEFAULT_ACT_AGENT,
  ACT_AGENT_DISPLAY_INFO,
  type ActPrimaryAgent,
} from '../../../keyword/keyword.types';

/**
 * Agent choice option for the CLI prompt
 */
export interface AgentChoice {
  name: string;
  value: ActPrimaryAgent;
  description?: string;
}

/**
 * Default primary agent - re-exported from keyword.types for backward compatibility
 */
export const DEFAULT_PRIMARY_AGENT = DEFAULT_ACT_AGENT;

/**
 * Get available primary agent choices for the CLI prompt
 */
export function getPrimaryAgentChoices(): AgentChoice[] {
  return ACT_PRIMARY_AGENTS.map(agentId => {
    const info = ACT_AGENT_DISPLAY_INFO[agentId as ActPrimaryAgent];
    const isDefault = agentId === DEFAULT_PRIMARY_AGENT;
    return {
      name: isDefault ? `${info.name} (Recommended)` : info.name,
      value: agentId,
      description: info.description,
    };
  });
}

/**
 * Prompt user to select primary development agent
 * @param message - Custom message for the prompt
 * @returns Selected agent ID
 */
export async function promptPrimaryAgentSelection(
  message = 'Select your primary development agent:',
): Promise<ActPrimaryAgent> {
  const choices = getPrimaryAgentChoices();

  return select({
    message,
    choices,
    default: DEFAULT_PRIMARY_AGENT,
  });
}
