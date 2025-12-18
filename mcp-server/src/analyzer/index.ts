// Types
export type {
  ProjectAnalysis,
  PackageInfo,
  DetectedFramework,
  FrameworkCategory,
  DirectoryAnalysis,
  ArchitecturePattern,
  ConfigFilesSummary,
  TsConfigSummary,
  EslintSummary,
  PrettierSummary,
  CodeSample,
  CodeCategory,
} from './analyzer.types';

// Analyzers
export {
  analyzePackage,
  parsePackageJson,
  detectFrameworks,
  FRAMEWORK_DEFINITIONS,
} from './package.analyzer';

export {
  analyzeDirectory,
  detectArchitecturePatterns,
  categorizeDirectory,
  ARCHITECTURE_PATTERNS,
} from './directory.analyzer';

export {
  analyzeConfigs,
  parseTsConfig,
  parseEslintConfig,
  parsePrettierConfig,
  detectConfigFiles,
  CONFIG_FILE_PATTERNS,
} from './config.analyzer';

export {
  sampleCode,
  selectSampleFiles,
  categorizeFile,
  detectLanguage,
  isCodeFile,
  LANGUAGE_EXTENSIONS,
} from './code.sampler';

// Service and Module
export { AnalyzerService, type AnalyzeOptions } from './analyzer.service';
export { AnalyzerModule } from './analyzer.module';
