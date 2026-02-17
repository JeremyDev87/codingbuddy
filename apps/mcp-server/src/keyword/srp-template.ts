/**
 * SRP (Structured Reasoning Process) Template
 *
 * Template for generating SRP instructions when task is classified as COMPLEX.
 * Extracted to separate file for maintainability and reusability.
 *
 * @module srp-template
 */

import type { ComplexityClassification } from './keyword.types';

/**
 * SRP template with placeholders for dynamic content.
 * Uses template literal for readability while keeping the template structure clear.
 */
const SRP_TEMPLATE = `## 🧠 Structured Reasoning Process (SRP) Required

This task is classified as **{{COMPLEXITY}}** ({{REASON}}).

**Apply the 5-step SRP process:**

### 1. DECOMPOSE
Break the problem into 2-5 manageable sub-problems.
- Identify independent sub-problems
- Consider dependencies between them

### 2. SOLVE
Address each sub-problem and assign confidence levels:
- 🟢 High (0.8+): Official docs, verified facts, testable
- 🟡 Medium (0.5-0.79): Reasonable inference, context-dependent
- 🔴 Low (<0.5): Speculation, insufficient info

### 3. VERIFY
Check each solution for:
- ✅ Logic validity
- ✅ Factual accuracy
- ✅ Completeness
- ✅ Potential bias

### 4. SYNTHESIZE
Combine results using the min() rule:
\`Overall Confidence = min(Sub-problem Confidences)\`

### 5. REFLECT
If overall confidence is Low or critical issues remain:
- Retry (max 2 times) by returning to DECOMPOSE
- Or output with explicit limitations

**Reference**: See \`structured-reasoning-guide.md\` for detailed examples.`;

/**
 * Generate SRP instructions from template.
 *
 * @param classification - Complexity classification with complexity and reason
 * @returns Formatted SRP instructions string
 */
export function renderSrpTemplate(
  classification: Pick<ComplexityClassification, 'complexity' | 'reason'>,
): string {
  return SRP_TEMPLATE.replace('{{COMPLEXITY}}', classification.complexity).replace(
    '{{REASON}}',
    classification.reason,
  );
}

/**
 * Export the raw template for testing purposes.
 */
export { SRP_TEMPLATE };
