/**
 * ConfigDiffService
 *
 * Compares project analysis with current config to suggest updates
 */

import { Injectable } from '@nestjs/common';
import type { ProjectAnalysis, FrameworkCategory } from '../analyzer';
import type { CodingBuddyConfig } from './config.schema';

/**
 * Priority level for suggestions
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Single config update suggestion
 */
export interface ConfigUpdateSuggestion {
  /** Config field path (e.g., 'techStack.frontend') */
  field: string;
  /** Reason for the suggestion */
  reason: string;
  /** Current value in config */
  currentValue: unknown;
  /** Suggested new value */
  suggestedValue: unknown;
  /** Priority level */
  priority: SuggestionPriority;
}

/**
 * Result of config comparison
 */
export interface ConfigDiffResult {
  /** Whether config is up to date */
  isUpToDate: boolean;
  /** List of suggested updates */
  suggestions: ConfigUpdateSuggestion[];
}

/**
 * Service for comparing config with project analysis
 */
@Injectable()
export class ConfigDiffService {
  /**
   * Compare project analysis with current config
   */
  compareConfig(analysis: ProjectAnalysis, config: CodingBuddyConfig): ConfigDiffResult {
    const suggestions: ConfigUpdateSuggestion[] = [];

    // Check project name
    const projectNameSuggestion = this.checkProjectName(analysis, config);
    if (projectNameSuggestion) {
      suggestions.push(projectNameSuggestion);
    }

    // Check tech stack
    const techStackSuggestions = this.checkTechStack(analysis, config);
    suggestions.push(...techStackSuggestions);

    // Check languages from config files
    const languageSuggestions = this.checkLanguages(analysis, config);
    suggestions.push(...languageSuggestions);

    // Check test frameworks
    const testSuggestions = this.checkTestFrameworks(analysis, config);
    suggestions.push(...testSuggestions);

    return {
      isUpToDate: suggestions.length === 0,
      suggestions,
    };
  }

  /**
   * Check if project name needs updating
   */
  private checkProjectName(
    analysis: ProjectAnalysis,
    config: CodingBuddyConfig,
  ): ConfigUpdateSuggestion | null {
    const analysisName = analysis.packageInfo?.name;
    const configName = config.projectName;

    if (analysisName && configName && analysisName !== configName) {
      return {
        field: 'projectName',
        reason: 'Project name in package.json differs from config',
        currentValue: configName,
        suggestedValue: analysisName,
        priority: 'medium',
      };
    }

    if (analysisName && !configName) {
      return {
        field: 'projectName',
        reason: 'Project name detected from package.json',
        currentValue: undefined,
        suggestedValue: analysisName,
        priority: 'low',
      };
    }

    return null;
  }

  /**
   * Check tech stack for missing frameworks
   */
  private checkTechStack(
    analysis: ProjectAnalysis,
    config: CodingBuddyConfig,
  ): ConfigUpdateSuggestion[] {
    const suggestions: ConfigUpdateSuggestion[] = [];
    const detectedFrameworks = analysis.packageInfo?.detectedFrameworks ?? [];

    // Group frameworks by category
    const frontendFrameworks = this.getFrameworksByCategory(detectedFrameworks, [
      'frontend',
      'fullstack',
    ]);
    const backendFrameworks = this.getFrameworksByCategory(detectedFrameworks, [
      'backend',
      'fullstack',
    ]);
    const databaseFrameworks = this.getFrameworksByCategory(detectedFrameworks, ['database']);

    // Check frontend
    const currentFrontend = config.techStack?.frontend ?? [];
    const missingFrontend = frontendFrameworks.filter(f => !currentFrontend.includes(f));
    if (missingFrontend.length > 0) {
      suggestions.push({
        field: 'techStack.frontend',
        reason: 'Detected new frontend framework(s)',
        currentValue: currentFrontend,
        suggestedValue: [...currentFrontend, ...missingFrontend],
        priority: 'high',
      });
    }

    // Check backend
    const currentBackend = config.techStack?.backend ?? [];
    const missingBackend = backendFrameworks.filter(f => !currentBackend.includes(f));
    if (missingBackend.length > 0) {
      suggestions.push({
        field: 'techStack.backend',
        reason: 'Detected new backend framework(s)',
        currentValue: currentBackend,
        suggestedValue: [...currentBackend, ...missingBackend],
        priority: 'high',
      });
    }

    // Check database
    const currentDatabase = config.techStack?.database ?? [];
    const missingDatabase = databaseFrameworks.filter(f => !currentDatabase.includes(f));
    if (missingDatabase.length > 0) {
      suggestions.push({
        field: 'techStack.database',
        reason: 'Detected new database tool(s)',
        currentValue: currentDatabase,
        suggestedValue: [...currentDatabase, ...missingDatabase],
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Check for programming languages based on config files
   */
  private checkLanguages(
    analysis: ProjectAnalysis,
    config: CodingBuddyConfig,
  ): ConfigUpdateSuggestion[] {
    const suggestions: ConfigUpdateSuggestion[] = [];
    const currentLanguages = config.techStack?.languages ?? [];
    const detectedLanguages: string[] = [];

    // Check TypeScript
    const hasTypeScript =
      analysis.configFiles.typescript ||
      analysis.configFiles.detected.some(f => f.includes('tsconfig'));

    if (hasTypeScript && !currentLanguages.includes('TypeScript')) {
      detectedLanguages.push('TypeScript');
    }

    // Check JavaScript (if not TypeScript and has package.json or jsconfig.json)
    const hasJavaScript =
      !hasTypeScript &&
      (analysis.packageInfo !== null ||
        analysis.configFiles.detected.some(f => f.includes('jsconfig')));

    if (hasJavaScript && !currentLanguages.includes('JavaScript')) {
      detectedLanguages.push('JavaScript');
    }

    if (detectedLanguages.length > 0) {
      suggestions.push({
        field: 'techStack.languages',
        reason: 'Detected programming language(s)',
        currentValue: currentLanguages,
        suggestedValue: [...currentLanguages, ...detectedLanguages],
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Check for test frameworks
   */
  private checkTestFrameworks(
    analysis: ProjectAnalysis,
    config: CodingBuddyConfig,
  ): ConfigUpdateSuggestion[] {
    const suggestions: ConfigUpdateSuggestion[] = [];
    const detectedFrameworks = analysis.packageInfo?.detectedFrameworks ?? [];
    const testFrameworks = this.getFrameworksByCategory(detectedFrameworks, ['testing']);

    const currentTestFrameworks = config.testStrategy?.frameworks ?? [];
    const missingTestFrameworks = testFrameworks.filter(f => !currentTestFrameworks.includes(f));

    if (missingTestFrameworks.length > 0) {
      suggestions.push({
        field: 'testStrategy.frameworks',
        reason: 'Detected test framework(s)',
        currentValue: currentTestFrameworks,
        suggestedValue: [...currentTestFrameworks, ...missingTestFrameworks],
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Get framework names by categories
   */
  private getFrameworksByCategory(
    frameworks: Array<{ name: string; category: FrameworkCategory }>,
    categories: FrameworkCategory[],
  ): string[] {
    return frameworks.filter(f => categories.includes(f.category)).map(f => f.name);
  }

  /**
   * Format suggestions as human-readable text
   */
  formatSuggestionsAsText(result: ConfigDiffResult): string {
    if (result.isUpToDate) {
      return '✅ Your configuration is up to date with the project analysis.';
    }

    const lines: string[] = ['📋 Configuration Update Suggestions:', ''];

    for (const suggestion of result.suggestions) {
      lines.push(`[${suggestion.priority.toUpperCase()}] ${suggestion.field}`);
      lines.push(`  Reason: ${suggestion.reason}`);
      lines.push(`  Current: ${JSON.stringify(suggestion.currentValue)}`);
      lines.push(`  Suggested: ${JSON.stringify(suggestion.suggestedValue)}`);
      lines.push('');
    }

    lines.push(
      '💡 Apply these changes to codingbuddy.config.json to keep your AI context accurate.',
    );

    return lines.join('\n');
  }
}
