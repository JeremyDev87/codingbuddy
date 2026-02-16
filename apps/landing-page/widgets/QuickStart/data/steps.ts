import type { QuickStartStep } from '@/types';

export const quickStartSteps: readonly QuickStartStep[] = [
  {
    step: 1,
    title: 'step1',
    code: 'npx codingbuddy init',
  },
  {
    step: 2,
    title: 'step2',
    code: `{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"]
    }
  }
}`,
  },
  {
    step: 3,
    title: 'step3',
    code: `PLAN design auth feature

# 🏛️ architecture  → System design
# 🧪 test-strategy → TDD approach
# 🔒 security      → OWASP checks`,
  },
];
