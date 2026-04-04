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
 * Maximum items to render in a list section before trimming
 */
const MAX_LIST_ITEMS = 10;

/**
 * Trim a list to maxItems and append an overflow indicator
 */
function trimList(items: string[], maxItems = MAX_LIST_ITEMS): string[] {
  if (items.length <= maxItems) return items;
  const remaining = items.length - maxItems;
  return [...items.slice(0, maxItems), `... and ${remaining} more`];
}

/**
 * Render an arbitrary object/array value as readable markdown (no JSON braces)
 */
function renderValueAsText(value: unknown, sections: string[], indent = ''): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        renderValueAsText(item, sections, indent);
      } else {
        sections.push(`${indent}- ${item}`);
      }
    }
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        sections.push(`${indent}- **${key}**:`);
        renderValueAsText(val, sections, indent + '  ');
      } else if (val && typeof val === 'object') {
        sections.push(`${indent}- **${key}**:`);
        renderValueAsText(val, sections, indent + '  ');
      } else {
        sections.push(`${indent}- **${key}**: ${val}`);
      }
    }
  }
}

/**
 * Build a complete system prompt for an agent to be executed as a subagent
 */
export function buildAgentSystemPrompt(agentProfile: AgentProfile, context: AgentContext): string {
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

  // Rich metadata from passthrough fields
  const rawProfile = agentProfile as Record<string, unknown>;
  const activation = rawProfile.activation as Record<string, unknown> | undefined;

  // Mandatory Checklist — prefer activation.mandatory_checklist (object with {rule:...} items)
  const activationChecklist = activation?.mandatory_checklist;
  if (
    activationChecklist &&
    typeof activationChecklist === 'object' &&
    !Array.isArray(activationChecklist)
  ) {
    sections.push('## Mandatory Checklist');
    const items: string[] = [];
    for (const [name, item] of Object.entries(activationChecklist as Record<string, unknown>)) {
      if (item && typeof item === 'object' && 'rule' in item) {
        items.push(`- [${name}] ${(item as { rule: string }).rule}`);
      }
    }
    for (const line of trimList(items)) {
      sections.push(line);
    }
    sections.push('');
  } else if (
    Array.isArray(rawProfile.mandatory_checklist) &&
    rawProfile.mandatory_checklist.length
  ) {
    // Backward compat: top-level array format
    sections.push('## Mandatory Checklist');
    const items = (rawProfile.mandatory_checklist as string[]).map((item: string) => `- ${item}`);
    for (const line of trimList(items)) {
      sections.push(line);
    }
    sections.push('');
  }

  // Communication language
  const comm = rawProfile.communication as Record<string, string> | undefined;
  if (comm?.language) {
    sections.push('## Communication');
    sections.push(`IMPORTANT: Always respond in ${comm.language}.`);
    sections.push('');
  }

  // Required / Recommended Skills
  const skills = rawProfile.skills as
    | {
        required?: Array<{ name: string; purpose: string; when: string }>;
        recommended?: Array<{ name: string; purpose: string; when: string }>;
      }
    | undefined;
  if (skills?.required?.length) {
    sections.push('## Required Skills');
    for (const s of skills.required) {
      sections.push(`- **${s.name}**: ${s.purpose} (when: ${s.when})`);
    }
    sections.push('');
  }
  if (skills?.recommended?.length) {
    sections.push('## Recommended Skills');
    for (const s of skills.recommended) {
      sections.push(`- **${s.name}**: ${s.purpose} (when: ${s.when})`);
    }
    sections.push('');
  }

  // Mode-specific instructions (agent-defined modes override generic)
  sections.push('## Current Mode');
  sections.push(`Mode: ${context.mode}`);
  sections.push('');

  const modesObj = rawProfile.modes as Record<string, unknown> | undefined;
  const modeKey = context.mode.toLowerCase();
  const agentModeConfig = modesObj?.[modeKey];
  if (agentModeConfig && typeof agentModeConfig === 'object') {
    sections.push('## Mode-Specific Instructions');
    renderValueAsText(agentModeConfig, sections);
    sections.push('');
  } else {
    sections.push(MODE_INSTRUCTIONS[context.mode]);
    sections.push('');
  }

  // Verification Guide — prefer activation.verification_guide
  const verificationGuide = activation?.verification_guide ?? rawProfile.verification_guide;
  if (Array.isArray(verificationGuide) && verificationGuide.length) {
    sections.push('## Verification Guide');
    const items = (verificationGuide as string[]).map((step: string) => `- ${step}`);
    for (const line of trimList(items)) {
      sections.push(line);
    }
    sections.push('');
  } else if (verificationGuide && typeof verificationGuide === 'object') {
    sections.push('## Verification Guide');
    const items: string[] = [];
    for (const [key, desc] of Object.entries(verificationGuide as Record<string, string>)) {
      items.push(`- **${key}**: ${desc}`);
    }
    for (const line of trimList(items)) {
      sections.push(line);
    }
    sections.push('');
  }

  // Execution Order — from activation.execution_order
  const executionOrder = activation?.execution_order;
  if (executionOrder && typeof executionOrder === 'object' && !Array.isArray(executionOrder)) {
    sections.push('## Execution Order');
    for (const [phase, steps] of Object.entries(executionOrder as Record<string, unknown>)) {
      if (Array.isArray(steps) && steps.length) {
        sections.push(`### ${phase}`);
        for (const line of trimList(steps as string[])) {
          sections.push(line);
        }
      }
    }
    sections.push('');
  } else if (Array.isArray(executionOrder) && executionOrder.length) {
    sections.push('## Execution Order');
    const items = (executionOrder as string[]).map(
      (step: string, i: number) => `${i + 1}. ${step}`,
    );
    for (const line of trimList(items)) {
      sections.push(line);
    }
    sections.push('');
  }

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
export function buildTaskDescription(agentProfile: AgentProfile, context: AgentContext): string {
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
