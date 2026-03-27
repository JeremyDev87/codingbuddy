import type { Session, CostEntry, AgentActivity, SkillUsage, PREntry } from './types';

function daysAgo(n: number): number {
  return Date.now() / 1000 - n * 86400;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockSessions(count = 30): Session[] {
  const projects = ['codingbuddy', 'my-app', 'api-server'];
  const models = ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'];
  const outcomes = ['success', 'success', 'success', 'partial', 'error'];

  return Array.from({ length: count }, (_, i) => {
    const startedAt = daysAgo(count - i) + randomBetween(0, 43200);
    const duration = randomBetween(60, 3600);
    return {
      sessionId: `session-${Date.now()}-${i}`,
      startedAt,
      endedAt: startedAt + duration,
      project: projects[i % projects.length],
      model: models[i % models.length],
      toolCallCount: randomBetween(5, 80),
      errorCount: randomBetween(0, 5),
      outcome: outcomes[i % outcomes.length],
    };
  });
}

export function generateMockCostEntries(days = 30): CostEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86400000);
    const sessions = randomBetween(1, 8);
    const toolCalls = sessions * randomBetween(10, 40);
    return {
      date: date.toISOString().split('T')[0],
      cost: parseFloat((toolCalls * 0.02 + sessions * 0.1).toFixed(2)),
      sessions,
      toolCalls,
    };
  });
}

export function generateMockAgentActivity(): AgentActivity[] {
  return [
    { agent: 'software-engineer', count: 145, successRate: 0.94 },
    { agent: 'frontend-developer', count: 89, successRate: 0.91 },
    { agent: 'test-engineer', count: 76, successRate: 0.97 },
    { agent: 'security-specialist', count: 42, successRate: 0.88 },
    { agent: 'code-quality-specialist', count: 38, successRate: 0.95 },
    { agent: 'architecture-specialist', count: 31, successRate: 0.9 },
    { agent: 'backend-developer', count: 28, successRate: 0.93 },
    { agent: 'devops-engineer', count: 15, successRate: 0.87 },
  ];
}

export function generateMockSkillUsage(): SkillUsage[] {
  return [
    { skill: 'parse_mode', count: 210 },
    { skill: 'update_context', count: 185 },
    { skill: 'search_rules', count: 120 },
    { skill: 'dispatch_agents', count: 95 },
    { skill: 'generate_checklist', count: 68 },
    { skill: 'analyze_task', count: 55 },
    { skill: 'get_agent_details', count: 42 },
    { skill: 'get_project_config', count: 30 },
  ];
}

export function generateMockPREntries(days = 30): PREntry[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86400000);
    return {
      date: date.toISOString().split('T')[0],
      created: randomBetween(0, 4),
      merged: randomBetween(0, 3),
    };
  });
}
