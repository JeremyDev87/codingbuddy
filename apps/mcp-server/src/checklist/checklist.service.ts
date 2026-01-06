import { Injectable, Inject, Logger } from '@nestjs/common';
import * as path from 'path';
import {
  CHECKLIST_DOMAINS,
  CHECKLIST_PRIORITIES,
  PRIORITY_VALUES,
  type ChecklistDefinition,
  type ChecklistDomain,
  type ChecklistPriority,
  type DomainChecklist,
  type GenerateChecklistInput,
  type GenerateChecklistOutput,
  type MatchedTrigger,
  type ChecklistSummary,
  type ChecklistItem,
} from './checklist.types';
import type { IFileSystem } from '../shared/filesystem.interface';
import { FILE_SYSTEM } from '../shared/filesystem.interface';
import {
  compilePatterns,
  type CompiledPattern,
} from '../shared/pattern-matcher';
import {
  parseAndValidateChecklist,
  ChecklistSchemaError,
} from './checklist.schema';
import { validatePath } from '../shared/security.utils';

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Category with pre-compiled file patterns for faster matching
 */
interface CompiledCategory {
  name: string;
  compiledFilePatterns: CompiledPattern[];
  items: ChecklistItem[];
}

/**
 * Cache entry with pre-compiled patterns
 */
interface CacheEntry {
  data: ChecklistDefinition;
  compiledCategories: CompiledCategory[];
  timestamp: number;
}

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);
  private readonly checklistsDir: string;
  private checklistCache: Map<ChecklistDomain, CacheEntry> = new Map();

  constructor(@Inject(FILE_SYSTEM) private readonly fileSystem: IFileSystem) {
    this.checklistsDir = this.findChecklistsDir();
  }

  private findChecklistsDir(): string {
    // Find packages/rules/.ai-rules/checklists directory
    const candidates = [
      path.resolve(
        __dirname,
        '../../../../packages/rules/.ai-rules/checklists',
      ),
      path.resolve(__dirname, '../../../packages/rules/.ai-rules/checklists'),
      path.resolve(__dirname, '../../../../.ai-rules/checklists'),
      path.resolve(__dirname, '../../../.ai-rules/checklists'),
    ];

    for (const candidate of candidates) {
      if (this.fileSystem.existsSync(candidate)) {
        return candidate;
      }
    }

    // Use environment variable if set
    if (process.env.CODINGBUDDY_RULES_DIR) {
      return path.join(process.env.CODINGBUDDY_RULES_DIR, 'checklists');
    }

    return candidates[0];
  }

  async generateChecklist(
    input: GenerateChecklistInput,
  ): Promise<GenerateChecklistOutput> {
    const { files, domains } = input;
    const matchedTriggers: MatchedTrigger[] = [];
    const domainItems: Map<ChecklistDomain, ChecklistItem[]> = new Map();

    // If domains are explicitly specified, use them (with validation)
    if (domains && domains.length > 0) {
      const validDomains = domains.filter(d => this.isValidDomain(d));
      const invalidDomains = domains.filter(d => !this.isValidDomain(d));

      if (invalidDomains.length > 0) {
        this.logger.warn(
          `Invalid domains ignored: ${invalidDomains.join(', ')}. Valid domains: ${CHECKLIST_DOMAINS.join(', ')}`,
        );
      }

      // Process valid domains in parallel
      const domainResults = await Promise.all(
        validDomains.map(async domain => {
          const checklist = await this.loadChecklist(domain);
          return { domain, checklist };
        }),
      );

      for (const { domain, checklist } of domainResults) {
        matchedTriggers.push({
          domain,
          category: 'all',
          reason: 'explicit',
          match: `Domain explicitly requested: ${domain}`,
        });

        if (checklist) {
          const items = this.getAllItemsFromChecklist(checklist.data);
          domainItems.set(domain, items);
        }
      }
    }

    // If files are provided, match against triggers (parallel processing)
    if (files && files.length > 0) {
      const allDomains = this.getAvailableDomains();
      const domainsToCheck = allDomains.filter(d => !domainItems.has(d));

      // Load all checklists in parallel
      const checklistResults = await Promise.all(
        domainsToCheck.map(async domain => {
          const checklist = await this.loadChecklist(domain);
          return { domain, checklist };
        }),
      );

      for (const { domain, checklist } of checklistResults) {
        if (!checklist) continue;

        const matchedItems: ChecklistItem[] = [];

        // Use pre-compiled patterns for faster matching
        for (const compiledCategory of checklist.compiledCategories) {
          const match = this.matchCompiledTriggers(files, compiledCategory);
          if (match) {
            matchedTriggers.push({
              domain,
              category: compiledCategory.name,
              reason: match.reason,
              match: match.match,
            });
            matchedItems.push(...compiledCategory.items);
          }
        }

        if (matchedItems.length > 0) {
          // Deduplicate items by id
          const uniqueItems = this.deduplicateItems(matchedItems);
          domainItems.set(domain, uniqueItems);
        }
      }
    }

    // Build output
    const checklists = await this.buildDomainChecklists(domainItems);
    const summary = this.calculateSummary(checklists);

    return {
      checklists,
      summary,
      matchedTriggers,
    };
  }

  /** Validates if a domain is in the allowed list */
  private isValidDomain(domain: string): domain is ChecklistDomain {
    return CHECKLIST_DOMAINS.includes(domain as ChecklistDomain);
  }

  private matchCompiledTriggers(
    files: string[],
    compiledCategory: CompiledCategory,
  ): {
    reason: 'file_pattern' | 'import_detected' | 'code_pattern';
    match: string;
  } | null {
    // Check file patterns using pre-compiled matchers
    for (const file of files) {
      for (const compiledPattern of compiledCategory.compiledFilePatterns) {
        if (compiledPattern.matcher.match(file)) {
          return {
            reason: 'file_pattern',
            match: `${file} matches ${compiledPattern.pattern}`,
          };
        }
      }
    }

    // Note: import and pattern detection would require reading file contents
    // For now, we only support file pattern matching
    // TODO: Add import detection and code pattern detection in future

    return null;
  }

  private getAllItemsFromChecklist(
    checklist: ChecklistDefinition,
  ): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    for (const category of checklist.categories) {
      items.push(...category.items);
    }
    return this.deduplicateItems(items);
  }

  private deduplicateItems(items: ChecklistItem[]): ChecklistItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private async buildDomainChecklists(
    domainItems: Map<ChecklistDomain, ChecklistItem[]>,
  ): Promise<DomainChecklist[]> {
    // Load all checklists in parallel
    const entries = Array.from(domainItems.entries());
    const checklistResults = await Promise.all(
      entries.map(async ([domain, items]) => {
        const checklist = await this.loadChecklist(domain);
        return { domain, items, checklist };
      }),
    );

    const checklists: DomainChecklist[] = [];

    for (const { domain, items, checklist } of checklistResults) {
      if (!checklist) continue;

      // Determine overall priority (highest priority item)
      const priority = this.getHighestPriority(items);

      checklists.push({
        domain,
        icon: checklist.data.icon,
        priority,
        items,
      });
    }

    // Sort by priority using shared constant
    return checklists.sort(
      (a, b) => PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority],
    );
  }

  private getHighestPriority(items: ChecklistItem[]): ChecklistPriority {
    for (const priority of CHECKLIST_PRIORITIES) {
      if (items.some(item => item.priority === priority)) {
        return priority;
      }
    }
    return 'low';
  }

  private calculateSummary(checklists: DomainChecklist[]): ChecklistSummary {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const checklist of checklists) {
      for (const item of checklist.items) {
        switch (item.priority) {
          case 'critical':
            critical++;
            break;
          case 'high':
            high++;
            break;
          case 'medium':
            medium++;
            break;
          case 'low':
            low++;
            break;
        }
      }
    }

    return {
      total: critical + high + medium + low,
      critical,
      high,
      medium,
      low,
    };
  }

  private async loadChecklist(
    domain: ChecklistDomain,
  ): Promise<CacheEntry | null> {
    // Check cache with TTL
    const cached = this.checklistCache.get(domain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached;
    }

    // Validate path to prevent path traversal attacks
    const pathValidation = validatePath(`${domain}.json`, {
      basePath: this.checklistsDir,
      allowAbsolute: false,
      allowedExtensions: ['.json'],
    });

    if (!pathValidation.valid) {
      this.logger.warn(
        `Path validation failed for domain '${domain}': ${pathValidation.error}`,
      );
      return null;
    }

    const filePath = pathValidation.resolvedPath!;

    try {
      const content = await this.fileSystem.readFile(filePath, 'utf-8');

      // Parse and validate against schema
      const checklist = parseAndValidateChecklist(content);

      // Pre-compile file patterns for each category
      const compiledCategories: CompiledCategory[] = checklist.categories.map(
        category => ({
          name: category.name,
          compiledFilePatterns: compilePatterns(category.triggers.files),
          items: category.items,
        }),
      );

      const cacheEntry: CacheEntry = {
        data: checklist,
        compiledCategories,
        timestamp: Date.now(),
      };
      this.checklistCache.set(domain, cacheEntry);
      return cacheEntry;
    } catch (error) {
      if (error instanceof ChecklistSchemaError) {
        this.logger.warn(
          `Invalid checklist schema for domain '${domain}': ${error.message}`,
        );
      } else {
        this.logger.warn(
          `Failed to load checklist for domain: ${domain}`,
          error,
        );
      }
      return null;
    }
  }

  /** Returns list of available domains */
  getAvailableDomains(): ChecklistDomain[] {
    return [...CHECKLIST_DOMAINS];
  }

  /** Clears the cache (useful for testing or forced refresh) */
  clearCache(): void {
    this.checklistCache.clear();
  }
}
