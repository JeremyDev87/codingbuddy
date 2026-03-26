import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RuleStats {
  name: string;
  callCount: number;
  lastUsedAt: string;
  firstUsedAt: string;
  modes: Record<string, number>;
}

export interface RuleEffectivenessReport {
  totalRules: number;
  activeRules: RuleStats[];
  unusedRules: string[];
  topRules: RuleStats[];
  generatedAt: string;
}

export class RuleTracker {
  private statsPath: string;
  private stats: Map<string, RuleStats>;

  constructor(statsPath?: string) {
    this.statsPath =
      statsPath ?? path.join(os.homedir(), '.codingbuddy', 'rule_stats.json');
    this.stats = new Map();
    this.load();
  }

  recordUsage(ruleNames: string[], mode: string): void {
    const now = new Date().toISOString();
    for (const name of ruleNames) {
      const existing = this.stats.get(name);
      if (existing) {
        existing.callCount += 1;
        existing.lastUsedAt = now;
        existing.modes[mode] = (existing.modes[mode] ?? 0) + 1;
      } else {
        this.stats.set(name, {
          name,
          callCount: 1,
          lastUsedAt: now,
          firstUsedAt: now,
          modes: { [mode]: 1 },
        });
      }
    }
    this.save();
  }

  load(): void {
    try {
      if (fs.existsSync(this.statsPath)) {
        const raw = fs.readFileSync(this.statsPath, 'utf-8');
        const entries: RuleStats[] = JSON.parse(raw);
        for (const entry of entries) {
          this.stats.set(entry.name, entry);
        }
      }
    } catch {
      this.stats = new Map();
    }
  }

  save(): void {
    try {
      const dir = path.dirname(this.statsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.statsPath,
        JSON.stringify(Array.from(this.stats.values()), null, 2),
        'utf-8',
      );
    } catch {
      // Never block caller
    }
  }

  getStats(ruleName: string): RuleStats | undefined {
    return this.stats.get(ruleName);
  }

  getAllStats(): RuleStats[] {
    return Array.from(this.stats.values());
  }

  getUnusedRules(days: number = 30, allKnownRules?: string[]): string[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    const knownSet = allKnownRules ?? [];
    const unused: string[] = [];

    for (const ruleName of knownSet) {
      const stat = this.stats.get(ruleName);
      if (!stat || stat.lastUsedAt < cutoffIso) {
        unused.push(ruleName);
      }
    }

    return unused;
  }

  generateReport(allKnownRules?: string[]): RuleEffectivenessReport {
    const activeRules = this.getAllStats();
    const allKnown = allKnownRules ?? activeRules.map((s) => s.name);

    const unusedRules = this.getUnusedRules(30, allKnown);

    const topRules = [...activeRules]
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    return {
      totalRules: allKnown.length,
      activeRules,
      unusedRules,
      topRules,
      generatedAt: new Date().toISOString(),
    };
  }
}
