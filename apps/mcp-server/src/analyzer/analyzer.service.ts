import { Injectable } from '@nestjs/common';
import type { ProjectAnalysis, PackageInfo } from './analyzer.types';
import { analyzePackage } from './package.analyzer';
import { analyzeDirectory } from './directory.analyzer';
import { analyzeConfigs } from './config.analyzer';
import { sampleCode } from './code.sampler';

/**
 * Options for project analysis
 */
export interface AnalyzeOptions {
  /** Maximum number of code samples to collect */
  maxCodeSamples?: number;
  /** Custom ignore patterns */
  ignorePatterns?: string[];
}

/**
 * Default analysis options
 */
const DEFAULT_OPTIONS: Required<AnalyzeOptions> = {
  maxCodeSamples: 5,
  ignorePatterns: [],
};

/**
 * Service for analyzing project structure and configuration
 */
@Injectable()
export class AnalyzerService {
  /**
   * Perform a complete project analysis
   *
   * @param projectRoot - Root directory of the project to analyze
   * @param options - Analysis options
   * @returns Complete project analysis result
   */
  async analyzeProject(
    projectRoot: string,
    options: AnalyzeOptions = {},
  ): Promise<ProjectAnalysis> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Run all analyzers in parallel
    const [packageInfo, dirAnalysis] = await Promise.all([
      analyzePackage(projectRoot),
      analyzeDirectory(projectRoot, opts.ignorePatterns),
    ]);

    // Config analysis depends on directory analysis for root files
    const configFiles = await analyzeConfigs(
      projectRoot,
      dirAnalysis.rootFiles,
    );

    // Sample code files using all scanned files
    const codeSamples = await sampleCode(
      projectRoot,
      dirAnalysis.allFiles,
      opts.maxCodeSamples,
    );

    // Infer patterns from all collected data
    const detectedPatterns = this.inferPatterns(packageInfo, dirAnalysis);

    return {
      packageInfo,
      directoryStructure: dirAnalysis,
      configFiles,
      codeSamples,
      detectedPatterns,
    };
  }

  /**
   * Infer high-level patterns from analysis results
   */
  private inferPatterns(
    packageInfo: PackageInfo | null,
    dirAnalysis: { patterns: { name: string; confidence: number }[] },
  ): string[] {
    const patterns: string[] = [];

    // Add architecture patterns with high confidence
    for (const pattern of dirAnalysis.patterns) {
      if (pattern.confidence >= 0.5) {
        patterns.push(pattern.name);
      }
    }

    // Add framework patterns from package.json
    if (packageInfo) {
      for (const framework of packageInfo.detectedFrameworks) {
        if (
          framework.category === 'frontend' ||
          framework.category === 'fullstack'
        ) {
          patterns.push(`${framework.name} Project`);
        }
        if (framework.category === 'backend') {
          patterns.push(`${framework.name} Backend`);
        }
      }

      // Detect TypeScript project
      if (
        packageInfo.devDependencies['typescript'] ||
        packageInfo.dependencies['typescript']
      ) {
        patterns.push('TypeScript');
      }

      // Detect monorepo patterns
      if (
        packageInfo.devDependencies['lerna'] ||
        packageInfo.devDependencies['turbo'] ||
        packageInfo.devDependencies['nx']
      ) {
        patterns.push('Monorepo');
      }
    }

    // Remove duplicates
    return [...new Set(patterns)];
  }

  /**
   * Quick analysis - package.json only
   */
  async quickAnalyze(projectRoot: string): Promise<PackageInfo | null> {
    return analyzePackage(projectRoot);
  }
}
