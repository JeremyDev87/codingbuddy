/**
 * Data Engineer Intent Patterns
 *
 * These patterns detect prompts related to database, schema, and data tasks.
 * Priority: 4th (after explicit, recommended, tooling patterns; before mobile and context).
 *
 * Confidence Levels:
 * - 0.95: Highly specific patterns (schema.prisma)
 * - 0.90: Database design keywords, migrations, SQL files
 * - 0.85: Query optimization, indexing, normalization
 *
 * @example
 * "schema.prisma 수정해줘" → data-engineer (0.95)
 * "데이터베이스 스키마 설계" → data-engineer (0.90)
 * "쿼리 최적화 필요해" → data-engineer (0.85)
 */

import type { IntentPattern } from './intent-patterns.types';

export const DATA_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Schema/migration patterns (0.95)
  {
    pattern: /schema\.prisma/i,
    confidence: 0.95,
    description: 'Prisma schema',
  },
  {
    pattern: /migration/i,
    confidence: 0.9,
    description: 'Database migration',
  },
  { pattern: /\.sql$/i, confidence: 0.9, description: 'SQL file' },
  // Database patterns (0.85-0.90)
  {
    pattern: /database|데이터베이스|DB\s*(설계|스키마|마이그레이션)/i,
    confidence: 0.9,
    description: 'Database design',
  },
  {
    pattern: /스키마|schema\s*design/i,
    confidence: 0.9,
    description: 'Schema design',
  },
  {
    pattern: /ERD|entity.?relationship/i,
    confidence: 0.9,
    description: 'ERD design',
  },
  {
    pattern: /쿼리\s*최적화|query\s*optim/i,
    confidence: 0.85,
    description: 'Query optimization',
  },
  {
    pattern: /인덱스|index(ing)?/i,
    confidence: 0.85,
    description: 'Indexing',
  },
  {
    pattern: /정규화|normaliz/i,
    confidence: 0.85,
    description: 'Normalization',
  },
];
