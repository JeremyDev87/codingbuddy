import { Injectable, Inject, Optional } from '@nestjs/common';
import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { RuleEventCollector } from './rule-event-collector';
import { RuleEvent } from './rule-event.types';

export const STATS_FILE_PATH = Symbol('STATS_FILE_PATH');
const DEFAULT_STATS_RELATIVE_PATH = 'docs/codingbuddy/rule-stats.json';

export interface RuleStatsEntry {
  applied: number;
  sessions: number;
}

export interface DomainStatsEntry {
  checks: number;
  issues_prevented: number;
}

export interface StatsFile {
  lastUpdated: string;
  rules: Record<string, RuleStatsEntry>;
  domains: Record<string, DomainStatsEntry>;
}

function createEmptyStats(): StatsFile {
  return {
    lastUpdated: new Date().toISOString(),
    rules: {},
    domains: {},
  };
}

function aggregateEvents(events: RuleEvent[]): StatsFile {
  const stats = createEmptyStats();

  for (const event of events) {
    switch (event.type) {
      case 'mode_activated': {
        if (!event.rule) break;
        if (!stats.rules[event.rule]) {
          stats.rules[event.rule] = { applied: 0, sessions: 0 };
        }
        stats.rules[event.rule].applied += 1;
        stats.rules[event.rule].sessions += 1;
        break;
      }
      case 'checklist_generated':
      case 'specialist_dispatched': {
        if (!event.domain) break;
        if (!stats.domains[event.domain]) {
          stats.domains[event.domain] = { checks: 0, issues_prevented: 0 };
        }
        stats.domains[event.domain].checks += 1;
        break;
      }
      case 'violation_caught': {
        if (!event.domain) break;
        if (!stats.domains[event.domain]) {
          stats.domains[event.domain] = { checks: 0, issues_prevented: 0 };
        }
        stats.domains[event.domain].issues_prevented += 1;
        break;
      }
    }
  }

  return stats;
}

function mergeStats(existing: StatsFile, incoming: StatsFile): StatsFile {
  const merged: StatsFile = {
    lastUpdated: new Date().toISOString(),
    rules: { ...existing.rules },
    domains: { ...existing.domains },
  };

  for (const [name, entry] of Object.entries(incoming.rules)) {
    if (merged.rules[name]) {
      merged.rules[name] = {
        applied: merged.rules[name].applied + entry.applied,
        sessions: merged.rules[name].sessions + entry.sessions,
      };
    } else {
      merged.rules[name] = { ...entry };
    }
  }

  for (const [name, entry] of Object.entries(incoming.domains)) {
    if (merged.domains[name]) {
      merged.domains[name] = {
        checks: merged.domains[name].checks + entry.checks,
        issues_prevented: merged.domains[name].issues_prevented + entry.issues_prevented,
      };
    } else {
      merged.domains[name] = { ...entry };
    }
  }

  return merged;
}

@Injectable()
export class RuleStatsWriter {
  private readonly statsPath: string;

  constructor(
    private readonly collector: RuleEventCollector,
    @Optional() @Inject(STATS_FILE_PATH) statsPath?: string,
  ) {
    this.statsPath = statsPath ?? join(process.cwd(), DEFAULT_STATS_RELATIVE_PATH);
  }

  async flush(): Promise<void> {
    const events = this.collector.flush();
    if (events.length === 0) {
      return;
    }

    const incoming = aggregateEvents(events);
    const existing = await this.readExistingStats();
    const merged = existing ? mergeStats(existing, incoming) : incoming;

    await this.atomicWrite(merged);
  }

  private async readExistingStats(): Promise<StatsFile | null> {
    try {
      const raw = await readFile(this.statsPath, 'utf-8');
      return JSON.parse(raw) as StatsFile;
    } catch {
      return null;
    }
  }

  private async atomicWrite(stats: StatsFile): Promise<void> {
    const dir = dirname(this.statsPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const tmpPath = this.statsPath + '.tmp';
    await writeFile(tmpPath, JSON.stringify(stats, null, 2), 'utf-8');
    await rename(tmpPath, this.statsPath);
  }
}
