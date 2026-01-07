import type { AgentProfile } from '../rules/rules.types';
import type { AgentContext } from './agent.types';
import type { Mode } from '../keyword/keyword.types';

/**
 * Mode-specific instructions for agent prompts
 */
const MODE_INSTRUCTIONS: Record<Mode, string> = {
  PLAN: `You are in PLAN mode. Your task is to:
- Analyze the requirements and design an implementation approach
- Plan architecture and component structure
- Identify potential risks and considerations
- Provide actionable recommendations for implementation`,

  ACT: `You are in ACT mode. Your task is to:
- Implement and verify the planned changes
- Check code quality and standards compliance
- Ensure proper test coverage
- Validate implementation against requirements`,

  EVAL: `You are in EVAL mode. Your task is to:
- Evaluate and assess the implementation quality
- Review code for potential issues and improvements
- Provide objective, evidence-based feedback
- Identify areas for improvement with specific recommendations`,

  AUTO: `You are in AUTO mode. Your task is to:
- Execute an autonomous PLAN → ACT → EVAL cycle
- Iterate until quality standards are met or max iterations reached
- Self-correct based on EVAL feedback in subsequent iterations
- Provide a final summary with all changes and remaining issues`,
};

/**
 * Mode-specific task description prefixes
 */
const MODE_TASK_PREFIXES: Record<Mode, string> = {
  PLAN: 'planning',
  ACT: 'verification',
  EVAL: 'review',
  AUTO: 'autonomous execution',
};

/**
 * Build a complete system prompt for an agent to be executed as a subagent
 */
export function buildAgentSystemPrompt(
  agentProfile: AgentProfile,
  context: AgentContext,
): string {
  const sections: string[] = [];

  // Agent identity
  sections.push(`# ${agentProfile.name}`);
  sections.push('');
  sections.push(`You are a ${agentProfile.role.title} specialist agent.`);
  sections.push('');

  // Agent description
  sections.push('## Description');
  sections.push(agentProfile.description);
  sections.push('');

  // Expertise
  sections.push('## Your Expertise');
  for (const expertise of agentProfile.role.expertise) {
    sections.push(`- ${expertise}`);
  }
  sections.push('');

  // Responsibilities
  if (agentProfile.role.responsibilities?.length) {
    sections.push('## Your Responsibilities');
    for (const responsibility of agentProfile.role.responsibilities) {
      sections.push(`- ${responsibility}`);
    }
    sections.push('');
  }

  // Mode-specific instructions
  sections.push('## Current Mode');
  sections.push(`Mode: ${context.mode}`);
  sections.push('');
  sections.push(MODE_INSTRUCTIONS[context.mode]);
  sections.push('');

  // Context information
  sections.push('## Task Context');

  if (context.taskDescription) {
    sections.push(`Task: ${context.taskDescription}`);
  }

  if (context.targetFiles?.length) {
    sections.push('');
    sections.push('Target Files:');
    for (const file of context.targetFiles) {
      sections.push(`- ${file}`);
    }
  }
  sections.push('');

  // Output format
  sections.push('## Output Format');
  sections.push(`Provide your analysis in a structured JSON format with the following fields:
- findings: Array of issues or observations found
- recommendations: Array of actionable recommendations
- summary: Brief summary of your assessment
- riskLevel: Overall risk level (critical/high/medium/low)

Ensure your output is valid JSON that can be parsed programmatically.`);

  return sections.join('\n');
}

/**
 * Build a short task description for Claude Code Task tool
 */
export function buildTaskDescription(
  agentProfile: AgentProfile,
  context: AgentContext,
): string {
  const agentShortName = agentProfile.name.split(' ')[0]; // e.g., "Security" from "Security Specialist"
  const modePrefix = MODE_TASK_PREFIXES[context.mode];

  return `${agentShortName} ${modePrefix}`;
}

/**
 * Build hint text for parallel execution using Claude Code Task tool
 */
export function buildParallelExecutionHint(): string {
  return `Use Claude Code Task tool with subagent_type: "general-purpose" and run_in_background: true for parallel execution. Launch multiple Task tools in a single message to run agents concurrently.`;
}
