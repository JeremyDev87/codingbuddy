import { Module } from '@nestjs/common';
import { AnalyzerService } from './analyzer.service';

/**
 * Module for project analysis functionality
 *
 * Provides services for analyzing:
 * - Package.json (dependencies, frameworks)
 * - Directory structure (architecture patterns)
 * - Config files (TypeScript, ESLint, Prettier)
 * - Source code samples
 */
@Module({
  providers: [AnalyzerService],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
