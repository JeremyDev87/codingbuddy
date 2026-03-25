import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadSessions,
  loadCostEntries,
  loadAgentActivity,
  loadSkillUsage,
  loadPREntries,
  sessionsFromRows,
  aggregateCostEntries,
  aggregateAgentActivity,
  aggregateSkillUsage,
  openDatabase,
} from '../data-loader';
import type { Session } from '../types';

describe('data-loader', () => {
  describe('sessionsFromRows', () => {
    it('converts raw DB rows to Session objects', () => {
      const rows = [
        {
          session_id: 'sess-1',
          started_at: 1711000000,
          ended_at: 1711003600,
          project: 'my-project',
          model: 'claude-opus-4-20250514',
          tool_call_count: 25,
          error_count: 2,
          outcome: 'success',
        },
      ];

      const result = sessionsFromRows(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sessionId: 'sess-1',
        startedAt: 1711000000,
        endedAt: 1711003600,
        project: 'my-project',
        model: 'claude-opus-4-20250514',
        toolCallCount: 25,
        errorCount: 2,
        outcome: 'success',
      });
    });

    it('handles null ended_at', () => {
      const rows = [
        {
          session_id: 'sess-2',
          started_at: 1711000000,
          ended_at: null,
          project: null,
          model: null,
          tool_call_count: 0,
          error_count: 0,
          outcome: null,
        },
      ];

      const result = sessionsFromRows(rows);
      expect(result[0].endedAt).toBeNull();
      expect(result[0].project).toBeNull();
    });

    it('returns empty array for empty input', () => {
      expect(sessionsFromRows([])).toEqual([]);
    });
  });

  describe('aggregateCostEntries', () => {
    it('groups sessions by date and calculates cost', () => {
      const sessions: Session[] = [
        {
          sessionId: 's1',
          startedAt: 1711929600, // 2024-04-01 00:00 UTC
          endedAt: 1711933200,
          project: 'proj',
          model: 'opus',
          toolCallCount: 50,
          errorCount: 0,
          outcome: 'success',
        },
        {
          sessionId: 's2',
          startedAt: 1711929600 + 3600,
          endedAt: 1711929600 + 7200,
          project: 'proj',
          model: 'opus',
          toolCallCount: 30,
          errorCount: 1,
          outcome: 'success',
        },
      ];

      const result = aggregateCostEntries(sessions);

      expect(result).toHaveLength(1);
      expect(result[0].sessions).toBe(2);
      expect(result[0].toolCalls).toBe(80);
      expect(result[0].cost).toBeGreaterThan(0);
    });

    it('returns empty array for no sessions', () => {
      expect(aggregateCostEntries([])).toEqual([]);
    });
  });

  describe('aggregateAgentActivity', () => {
    it('counts tool calls by agent prefix', () => {
      const toolCalls = [
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Agent(software-engineer)',
          inputSummary: null,
          success: true,
        },
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Agent(software-engineer)',
          inputSummary: null,
          success: true,
        },
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Agent(test-engineer)',
          inputSummary: null,
          success: false,
        },
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];

      const result = aggregateAgentActivity(toolCalls);

      expect(result).toHaveLength(2);
      const se = result.find(a => a.agent === 'software-engineer');
      expect(se?.count).toBe(2);
      expect(se?.successRate).toBe(1);

      const te = result.find(a => a.agent === 'test-engineer');
      expect(te?.count).toBe(1);
      expect(te?.successRate).toBe(0);
    });

    it('returns empty array for no agent calls', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];
      expect(aggregateAgentActivity(toolCalls)).toEqual([]);
    });
  });

  describe('aggregateSkillUsage', () => {
    it('counts skill invocations from tool calls', () => {
      const toolCalls = [
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Skill(commit)',
          inputSummary: null,
          success: true,
        },
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Skill(commit)',
          inputSummary: null,
          success: true,
        },
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'Skill(ship)',
          inputSummary: null,
          success: true,
        },
        {
          sessionId: 's1',
          timestamp: 0,
          toolName: 'mcp__codingbuddy__parse_mode',
          inputSummary: null,
          success: true,
        },
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];

      const result = aggregateSkillUsage(toolCalls);

      expect(result).toHaveLength(3);
      const commit = result.find(s => s.skill === 'commit');
      expect(commit?.count).toBe(2);

      const parseMode = result.find(s => s.skill === 'parse_mode');
      expect(parseMode?.count).toBe(1);
    });

    it('returns empty array when no skills used', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];
      expect(aggregateSkillUsage(toolCalls)).toEqual([]);
    });
  });

  describe('loadSessions', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadSessions('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('sessionId');
      expect(result[0]).toHaveProperty('startedAt');
    });
  });

  describe('loadCostEntries', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadCostEntries('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('cost');
    });
  });

  describe('loadAgentActivity', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadAgentActivity('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('agent');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('loadSkillUsage', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadSkillUsage('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('skill');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('loadPREntries', () => {
    it('returns mock data when parsing fails', async () => {
      const result = await loadPREntries('/nonexistent/dir');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('created');
      expect(result[0]).toHaveProperty('merged');
    });
  });

  describe('openDatabase', () => {
    let tmpDir: string;
    let dbPath: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'dataloader-pragma-'));
      dbPath = join(tmpDir, 'test.db');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      db.exec('CREATE TABLE sessions (id INTEGER PRIMARY KEY)');
      db.close();
    });

    afterEach(() => {
      try {
        unlinkSync(dbPath);
      } catch {}
      try {
        unlinkSync(dbPath + '-wal');
      } catch {}
      try {
        unlinkSync(dbPath + '-shm');
      } catch {}
      try {
        rmdirSync(tmpDir);
      } catch {}
    });

    it('sets PRAGMA busy_timeout=5000', () => {
      const db = openDatabase(dbPath);
      expect(db).not.toBeNull();
      const result = db!.pragma('busy_timeout', { simple: true });
      expect(result).toBe(5000);
      db!.close();
    });

    it('returns null for nonexistent path', () => {
      expect(openDatabase('/nonexistent/path.db')).toBeNull();
    });
  });

  describe('integration: real SQLite schema', () => {
    let tmpDir: string;
    let dbPath: string;
    const now = Date.now() / 1000;

    const SCHEMA = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        started_at REAL NOT NULL,
        ended_at REAL,
        project TEXT,
        model TEXT,
        tool_call_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        outcome TEXT
      );
      CREATE TABLE IF NOT EXISTS tool_calls (
        id INTEGER PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        tool_name TEXT NOT NULL,
        input_summary TEXT,
        success INTEGER DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    `;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'dataloader-integration-'));
      dbPath = join(tmpDir, 'history.db');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      db.exec(SCHEMA);

      db.prepare(
        'INSERT INTO sessions (session_id, started_at, ended_at, project, model, tool_call_count, error_count, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('test-sess-1', now - 3600, now, 'my-project', 'claude-opus', 42, 3, 'success');

      db.prepare(
        'INSERT INTO tool_calls (session_id, timestamp, tool_name, input_summary, success) VALUES (?, ?, ?, ?, ?)',
      ).run('test-sess-1', now - 1800, 'Agent(software-engineer)', 'implement feature', 1);
      db.prepare(
        'INSERT INTO tool_calls (session_id, timestamp, tool_name, input_summary, success) VALUES (?, ?, ?, ?, ?)',
      ).run('test-sess-1', now - 900, 'Skill(commit)', null, 1);
      db.prepare(
        'INSERT INTO tool_calls (session_id, timestamp, tool_name, input_summary, success) VALUES (?, ?, ?, ?, ?)',
      ).run('test-sess-1', now - 600, 'mcp__codingbuddy__parse_mode', null, 1);

      db.close();
    });

    afterEach(() => {
      try {
        unlinkSync(dbPath);
      } catch {}
      try {
        unlinkSync(dbPath + '-wal');
      } catch {}
      try {
        unlinkSync(dbPath + '-shm');
      } catch {}
      try {
        rmdirSync(tmpDir);
      } catch {}
    });

    it('loadSessions reads sessions from real DB', async () => {
      const sessions = await loadSessions(dbPath);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('test-sess-1');
      expect(sessions[0].project).toBe('my-project');
      expect(sessions[0].model).toBe('claude-opus');
      expect(sessions[0].toolCallCount).toBe(42);
      expect(sessions[0].errorCount).toBe(3);
      expect(sessions[0].outcome).toBe('success');
    });

    it('loadCostEntries aggregates cost from real DB', async () => {
      const entries = await loadCostEntries(dbPath);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].sessions).toBe(1);
      expect(entries[0].toolCalls).toBe(42);
      expect(entries[0].cost).toBeGreaterThan(0);
    });

    it('loadAgentActivity aggregates agents from real DB', async () => {
      const activity = await loadAgentActivity(dbPath);
      expect(activity).toHaveLength(1);
      expect(activity[0].agent).toBe('software-engineer');
      expect(activity[0].count).toBe(1);
      expect(activity[0].successRate).toBe(1);
    });

    it('loadSkillUsage aggregates skills from real DB', async () => {
      const usage = await loadSkillUsage(dbPath);
      expect(usage).toHaveLength(2);
      const skills = usage.map(u => u.skill);
      expect(skills).toContain('commit');
      expect(skills).toContain('parse_mode');
    });
  });
});
