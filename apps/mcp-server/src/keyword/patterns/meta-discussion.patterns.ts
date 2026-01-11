/**
 * Meta-Discussion Patterns
 *
 * These patterns detect when user is DISCUSSING agents rather than
 * REQUESTING work for a specific agent type.
 *
 * These patterns prevent false positives like:
 * - "Mobile Developer가 매칭되었어" → should NOT trigger mobile-developer
 * - "Frontend Developer Agent가 사용되고 있어" → should NOT trigger frontend-developer
 * - "Primary Agent 선택 로직 점검" → discussing agent system itself
 *
 * When meta-discussion is detected, intent patterns are skipped to avoid
 * incorrect agent matching based on agent names mentioned in discussion.
 */
export const META_AGENT_DISCUSSION_PATTERNS: ReadonlyArray<RegExp> = [
  // Discussing specific agent names (Korean particles indicate object/subject)
  /(?:mobile|frontend|backend|data|platform|devops|ai-?ml).?(?:developer|engineer)\s*(?:가|이|를|은|는|로|에|의|와|과)/i,
  // Discussing agent matching/selection/resolution
  /(?:agent|에이전트)\s*(?:매칭|호출|선택|resolution|matching|selection|추천|recommendation)/i,
  // Discussing Primary Agent system (NOT implementation - requires discussion keywords)
  // "primary agent 선택 로직" → meta-discussion
  // "primary agent resolver 코드 수정" → implementation work (NOT matched)
  /primary\s*agent\s*(?:선택|매칭|시스템|system)/i,
  // Discussing agent activation/invocation issues
  /(?:agent|에이전트)\s*(?:활성화|activation|호출|invocation|파이프라인|pipeline)/i,
  // Debugging agent behavior
  /(?:agent|에이전트).{0,20}(?:버그|bug|문제|issue|오류|error|잘못|wrong)/i,
];
