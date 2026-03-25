export interface Session {
  sessionId: string;
  startedAt: number;
  endedAt: number | null;
  project: string | null;
  model: string | null;
  toolCallCount: number;
  errorCount: number;
  outcome: string | null;
}

export interface ToolCall {
  sessionId: string;
  timestamp: number;
  toolName: string;
  inputSummary: string | null;
  success: boolean;
}

export interface CostEntry {
  date: string;
  cost: number;
  sessions: number;
  toolCalls: number;
}

export interface AgentActivity {
  agent: string;
  count: number;
  successRate: number;
}

export interface SkillUsage {
  skill: string;
  count: number;
}

export interface PREntry {
  date: string;
  created: number;
  merged: number;
}

export interface DashboardData {
  sessions: Session[];
  costEntries: CostEntry[];
  agentActivity: AgentActivity[];
  skillUsage: SkillUsage[];
  prEntries: PREntry[];
  isUsingMockData: boolean;
}
