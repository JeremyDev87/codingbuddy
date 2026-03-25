import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Session, ToolCall, CostEntry, AgentActivity, SkillUsage, PREntry } from './types';
import {
  generateMockSessions,
  generateMockCostEntries,
  generateMockAgentActivity,
  generateMockSkillUsage,
  generateMockPREntries,
} from './mock-data';

const COST_PER_TOOL_CALL = 0.02;
const COST_PER_SESSION = 0.1;

interface RawSessionRow {
  session_id: string;
  started_at: number;
  ended_at: number | null;
  project: string | null;
  model: string | null;
  tool_call_count: number;
  error_count: number;
  outcome: string | null;
}

interface RawToolCallRow {
  session_id: string;
  timestamp: number;
  tool_name: string;
  input_summary: string | null;
  success: number;
}

export function sessionsFromRows(rows: RawSessionRow[]): Session[] {
  return rows.map(row => ({
    sessionId: row.session_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    project: row.project,
    model: row.model,
    toolCallCount: row.tool_call_count,
    errorCount: row.error_count,
    outcome: row.outcome,
  }));
}

export function aggregateCostEntries(sessions: Session[]): CostEntry[] {
  if (sessions.length === 0) return [];

  const byDate = new Map<string, { sessions: number; toolCalls: number }>();

  for (const session of sessions) {
    const date = new Date(session.startedAt * 1000).toISOString().split('T')[0];
    const existing = byDate.get(date) ?? { sessions: 0, toolCalls: 0 };
    existing.sessions += 1;
    existing.toolCalls += session.toolCallCount;
    byDate.set(date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      cost: parseFloat(
        (data.toolCalls * COST_PER_TOOL_CALL + data.sessions * COST_PER_SESSION).toFixed(2),
      ),
      sessions: data.sessions,
      toolCalls: data.toolCalls,
    }));
}

export function aggregateAgentActivity(toolCalls: ToolCall[]): AgentActivity[] {
  const agentPattern = /^Agent\((.+)\)$/;
  const byAgent = new Map<string, { total: number; successes: number }>();

  for (const tc of toolCalls) {
    const match = tc.toolName.match(agentPattern);
    if (!match) continue;
    const agent = match[1];
    const existing = byAgent.get(agent) ?? { total: 0, successes: 0 };
    existing.total += 1;
    if (tc.success) existing.successes += 1;
    byAgent.set(agent, existing);
  }

  return Array.from(byAgent.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([agent, data]) => ({
      agent,
      count: data.total,
      successRate: data.total > 0 ? data.successes / data.total : 0,
    }));
}

export function aggregateSkillUsage(toolCalls: ToolCall[]): SkillUsage[] {
  const skillPattern = /^Skill\((.+)\)$/;
  const mcpPattern = /^mcp__codingbuddy__(.+)$/;
  const bySkill = new Map<string, number>();

  for (const tc of toolCalls) {
    let skill: string | null = null;
    const skillMatch = tc.toolName.match(skillPattern);
    if (skillMatch) {
      skill = skillMatch[1];
    } else {
      const mcpMatch = tc.toolName.match(mcpPattern);
      if (mcpMatch) {
        skill = mcpMatch[1];
      }
    }
    if (skill) {
      bySkill.set(skill, (bySkill.get(skill) ?? 0) + 1);
    }
  }

  return Array.from(bySkill.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([skill, count]) => ({ skill, count }));
}

export function openDatabase(dbPath: string) {
  try {
    if (!existsSync(dbPath)) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    db.pragma('busy_timeout = 5000');
    return db;
  } catch {
    return null;
  }
}

export async function loadSessions(
  dbPath: string = `${process.env.HOME}/.codingbuddy/history.db`,
  days = 30,
): Promise<Session[]> {
  const db = openDatabase(dbPath);
  if (!db) return generateMockSessions(days);

  try {
    const cutoff = Date.now() / 1000 - days * 86400;
    const rows = db
      .prepare(
        'SELECT session_id, started_at, ended_at, project, model, tool_call_count, error_count, outcome FROM sessions WHERE started_at >= ? ORDER BY started_at DESC',
      )
      .all(cutoff) as RawSessionRow[];
    return sessionsFromRows(rows);
  } catch {
    return generateMockSessions(days);
  } finally {
    db.close();
  }
}

export async function loadCostEntries(
  dbPath: string = `${process.env.HOME}/.codingbuddy/history.db`,
  days = 30,
): Promise<CostEntry[]> {
  const db = openDatabase(dbPath);
  if (!db) return generateMockCostEntries(days);

  try {
    const cutoff = Date.now() / 1000 - days * 86400;
    const rows = db
      .prepare(
        'SELECT session_id, started_at, ended_at, project, model, tool_call_count, error_count, outcome FROM sessions WHERE started_at >= ? ORDER BY started_at',
      )
      .all(cutoff) as RawSessionRow[];
    const sessions = sessionsFromRows(rows);
    return aggregateCostEntries(sessions);
  } catch {
    return generateMockCostEntries(days);
  } finally {
    db.close();
  }
}

export async function loadAgentActivity(
  dbPath: string = `${process.env.HOME}/.codingbuddy/history.db`,
): Promise<AgentActivity[]> {
  const db = openDatabase(dbPath);
  if (!db) return generateMockAgentActivity();

  try {
    const rows = db
      .prepare('SELECT session_id, timestamp, tool_name, input_summary, success FROM tool_calls')
      .all() as RawToolCallRow[];
    const toolCalls: ToolCall[] = rows.map(r => ({
      sessionId: r.session_id,
      timestamp: r.timestamp,
      toolName: r.tool_name,
      inputSummary: r.input_summary,
      success: r.success === 1,
    }));
    return aggregateAgentActivity(toolCalls);
  } catch {
    return generateMockAgentActivity();
  } finally {
    db.close();
  }
}

export async function loadSkillUsage(
  dbPath: string = `${process.env.HOME}/.codingbuddy/history.db`,
): Promise<SkillUsage[]> {
  const db = openDatabase(dbPath);
  if (!db) return generateMockSkillUsage();

  try {
    const rows = db
      .prepare('SELECT session_id, timestamp, tool_name, input_summary, success FROM tool_calls')
      .all() as RawToolCallRow[];
    const toolCalls: ToolCall[] = rows.map(r => ({
      sessionId: r.session_id,
      timestamp: r.timestamp,
      toolName: r.tool_name,
      inputSummary: r.input_summary,
      success: r.success === 1,
    }));
    return aggregateSkillUsage(toolCalls);
  } catch {
    return generateMockSkillUsage();
  } finally {
    db.close();
  }
}

export async function loadPREntries(repoPath?: string, days = 30): Promise<PREntry[]> {
  try {
    const cwd = repoPath ?? process.cwd();
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const gitLog = execSync(`git log --since="${since}" --pretty=format:"%ad|%s" --date=short`, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (!gitLog.trim()) return generateMockPREntries(days);

    const byDate = new Map<string, { created: number; merged: number }>();
    for (const line of gitLog.split('\n')) {
      const [date, subject] = line.split('|', 2);
      if (!date || !subject) continue;
      const existing = byDate.get(date) ?? { created: 0, merged: 0 };
      if (/\(#\d+\)/.test(subject)) {
        existing.merged += 1;
      }
      existing.created += 1;
      byDate.set(date, existing);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  } catch {
    return generateMockPREntries(days);
  }
}
