/**
 * Pure-function stack matcher: maps user prompts to agent stacks
 * using tag-based heuristics and domain keyword detection.
 *
 * No NestJS dependency — designed for direct use in KeywordService.
 */

export interface StackMatchInput {
  name: string;
  category: string;
  tags: string[];
  /** Specialist agent names from the stack definition (used for specialist resolution) */
  specialist_agents?: string[];
}

export interface StackMatchResult {
  stackName: string;
  confidence: number;
  matchedTags: string[];
  stackBased: true;
}

/**
 * Domain-keyword → tag mapping.
 * Each entry maps regex patterns in the user prompt to one or more stack tags.
 */
const DOMAIN_KEYWORDS: ReadonlyArray<{ pattern: RegExp; tags: string[] }> = [
  // Backend / API
  { pattern: /\bREST\b/i, tags: ['rest', 'api'] },
  { pattern: /\bGraphQL\b/i, tags: ['graphql', 'api'] },
  { pattern: /\bAPI\b/i, tags: ['api'] },
  { pattern: /\bbackend\b/i, tags: ['backend'] },
  { pattern: /\bendpoint/i, tags: ['api', 'backend'] },
  { pattern: /\bcontroller/i, tags: ['api', 'backend'] },
  { pattern: /\bservice\s+layer/i, tags: ['backend'] },
  { pattern: /\broute/i, tags: ['api', 'backend'] },

  // Security
  { pattern: /\bsecurity\b/i, tags: ['security'] },
  { pattern: /\baudit\b/i, tags: ['audit', 'security'] },
  { pattern: /\b(?:vulnerability|vulnerabilities)\b/i, tags: ['vulnerability', 'security'] },
  { pattern: /\bcompliance\b/i, tags: ['compliance', 'security'] },
  { pattern: /\bOAuth\b/i, tags: ['security'] },
  { pattern: /\bJWT\b/i, tags: ['security'] },
  { pattern: /\b(?:XSS|CSRF)\b/i, tags: ['security', 'vulnerability'] },
  { pattern: /\bauthenticat/i, tags: ['security'] },

  // Frontend / UI / UX
  { pattern: /\bUI\b/i, tags: ['ui', 'frontend'] },
  { pattern: /\bUX\b/i, tags: ['ux', 'frontend'] },
  { pattern: /\baccessibility\b/i, tags: ['accessibility', 'frontend'] },
  { pattern: /\bSEO\b/i, tags: ['seo', 'frontend'] },
  { pattern: /\bfrontend\b/i, tags: ['frontend'] },

  // Data
  { pattern: /\bETL\b/i, tags: ['etl', 'data'] },
  { pattern: /\bpipeline\b/i, tags: ['pipeline', 'data'] },
  { pattern: /\banalytics\b/i, tags: ['analytics', 'data'] },
  { pattern: /\bdata\s+(warehouse|lake|pipeline|ingestion)/i, tags: ['data', 'pipeline'] },

  // ML
  { pattern: /\bmodel\s+(training|inference|deploy)/i, tags: ['model', 'ml'] },
  { pattern: /\bML\b/i, tags: ['ml'] },
  { pattern: /\bmachine\s*learning/i, tags: ['ml', 'ai'] },
  { pattern: /\binference\b/i, tags: ['inference', 'ml'] },
  { pattern: /\btraining\b/i, tags: ['training', 'ml'] },

  // Full-stack
  { pattern: /\bfull[- ]?stack\b/i, tags: ['fullstack'] },

  // Korean keywords
  { pattern: /보안/i, tags: ['security'] },
  { pattern: /취약점/i, tags: ['vulnerability', 'security'] },
  { pattern: /감사/i, tags: ['audit', 'security'] },
  { pattern: /접근성/i, tags: ['accessibility', 'frontend'] },
  { pattern: /데이터\s*파이프라인/i, tags: ['data', 'pipeline'] },
  { pattern: /머신\s*러닝|기계\s*학습/i, tags: ['ml', 'ai'] },
];

/** Minimum confidence threshold to suggest a stack */
const MIN_CONFIDENCE = 0.3;

/**
 * Match a user prompt against available agent stacks.
 *
 * @param prompt - User prompt text
 * @param stacks - Available agent stacks (name, category, tags)
 * @returns Best matching stack with confidence, or null if no confident match
 */
export function matchStack(
  prompt: string,
  stacks: readonly StackMatchInput[],
): StackMatchResult | null {
  if (!prompt || stacks.length === 0) return null;

  // Extract tags detected in the prompt
  const detectedTags = new Set<string>();
  for (const { pattern, tags } of DOMAIN_KEYWORDS) {
    if (pattern.test(prompt)) {
      for (const tag of tags) detectedTags.add(tag);
    }
  }

  if (detectedTags.size === 0) return null;

  // Score each stack by tag overlap
  let bestResult: StackMatchResult | null = null;

  for (const stack of stacks) {
    const matched: string[] = [];
    for (const tag of stack.tags) {
      if (detectedTags.has(tag)) matched.push(tag);
    }

    if (matched.length === 0) continue;

    // Confidence = matched / total tags, capped at 1.0
    // Weighted by how many detected tags are covered
    const tagCoverage = matched.length / stack.tags.length;
    const detectedCoverage = matched.length / detectedTags.size;
    const confidence = Math.min((tagCoverage + detectedCoverage) / 2, 1.0);

    if (confidence < MIN_CONFIDENCE) continue;

    if (!bestResult || confidence > bestResult.confidence) {
      bestResult = {
        stackName: stack.name,
        confidence,
        matchedTags: matched,
        stackBased: true,
      };
    }
  }

  return bestResult;
}
