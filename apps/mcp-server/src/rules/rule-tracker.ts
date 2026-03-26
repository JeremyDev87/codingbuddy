import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface RuleStats {
  count: number;
  lastUsed: number;
}

export interface RuleEffectivenessReport {
  totalRulesTracked: number;
  generatedAt: number;
  entries: Array<{
    name: string;
    count: number;
    lastUsed: number;
  }>;
}

export class RuleTracker {
  private stats: Record<string, RuleStats> = {};

  constructor(private readonly statsPath: string) {}

  static async fromFile(statsPath: string): Promise<RuleTracker> {
    const tracker = new RuleTracker(statsPath);
    try {
      const raw = await readFile(statsPath, 'utf-8');
      tracker.stats = JSON.parse(raw);
    } catch {
      // File doesn't exist or is invalid — start fresh
    }
    return tracker;
  }

  trackRuleUsage(ruleNames: string[]): void {
    const now = Date.now();
    for (const name of ruleNames) {
      if (!name) continue;
      if (this.stats[name]) {
        this.stats[name].count += 1;
        this.stats[name].lastUsed = now;
      } else {
        this.stats[name] = { count: 1, lastUsed: now };
      }
    }
  }

  getStats(): Record<string, RuleStats> {
    return JSON.parse(JSON.stringify(this.stats));
  }

  detectUnusedRules(allRuleNames: string[], thresholdDays: number): string[] {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const unused: string[] = [];

    for (const name of allRuleNames) {
      const stat = this.stats[name];
      if (!stat || now - stat.lastUsed > thresholdMs) {
        unused.push(name);
      }
    }

    return unused;
  }

  generateReport(): RuleEffectivenessReport {
    const entries = Object.entries(this.stats)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        lastUsed: stat.lastUsed,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRulesTracked: entries.length,
      generatedAt: Date.now(),
      entries,
    };
  }

  async save(): Promise<void> {
    const dir = dirname(this.statsPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await writeFile(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8');
  }
}
