#!/bin/bash
# AI Rules Validation Script
# Validates the common AI rules structure and references

set -e

echo "🔍 Validating AI Rules Structure..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check .ai-rules directory exists
if [ ! -d ".ai-rules" ]; then
  echo -e "${RED}❌ .ai-rules/ directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ .ai-rules/ directory exists${NC}"

# Check subdirectories exist
for dir in rules agents adapters; do
  if [ ! -d ".ai-rules/$dir" ]; then
    echo -e "${RED}❌ .ai-rules/$dir/ directory not found${NC}"
    ((ERRORS++))
  else
    echo -e "${GREEN}✅ .ai-rules/$dir/ directory exists${NC}"
  fi
done

echo ""
echo "📚 Checking Common Rules..."

# Check required rule files
for rule in core.md project.md augmented-coding.md; do
  if [ ! -f ".ai-rules/rules/$rule" ]; then
    echo -e "${RED}❌ Missing rule: .ai-rules/rules/$rule${NC}"
    ((ERRORS++))
  else
    # Check file is not empty
    if [ ! -s ".ai-rules/rules/$rule" ]; then
      echo -e "${RED}❌ Empty rule file: .ai-rules/rules/$rule${NC}"
      ((ERRORS++))
    else
      # Check for Cursor-specific frontmatter (should not exist)
      if grep -q "^---$" ".ai-rules/rules/$rule" | head -1; then
        echo -e "${YELLOW}⚠️  Warning: .ai-rules/rules/$rule may contain frontmatter${NC}"
      fi
      echo -e "${GREEN}✅ Found: .ai-rules/rules/$rule${NC}"
    fi
  fi
done

echo ""
echo "🤖 Checking Agent Files..."

# Check agent README
if [ ! -f ".ai-rules/agents/README.md" ]; then
  echo -e "${RED}❌ Missing .ai-rules/agents/README.md${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ Found: .ai-rules/agents/README.md${NC}"
fi

# Check required agent JSON files
REQUIRED_AGENTS=(
  "frontend-developer"
  "code-reviewer"
  "accessibility-specialist"
  "architecture-specialist"
  "code-quality-specialist"
  "ui-ux-designer"
  "documentation-specialist"
  "devops-engineer"
  "performance-specialist"
  "security-specialist"
  "seo-specialist"
  "test-strategy-specialist"
)

for agent in "${REQUIRED_AGENTS[@]}"; do
  file=".ai-rules/agents/$agent.json"
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Missing agent: $file${NC}"
    ((ERRORS++))
  else
    # Validate JSON syntax
    if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
      echo -e "${RED}❌ Invalid JSON: $file${NC}"
      ((ERRORS++))
    else
      echo -e "${GREEN}✅ Found: $file (valid JSON)${NC}"
    fi
  fi
done

echo ""
echo "🔌 Checking Adapter Guides..."

# Check adapter files
ADAPTERS=("cursor" "claude-code" "codex" "antigravity" "q" "kiro")

for adapter in "${ADAPTERS[@]}"; do
  file=".ai-rules/adapters/$adapter.md"
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Missing adapter: $file${NC}"
    ((ERRORS++))
  else
    echo -e "${GREEN}✅ Found: $file${NC}"
  fi
done

echo ""
echo "📖 Checking Main README..."

if [ ! -f ".ai-rules/README.md" ]; then
  echo -e "${RED}❌ Missing .ai-rules/README.md${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ Found: .ai-rules/README.md${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All validation checks passed!${NC}"
  echo ""
  echo "Common AI Rules structure is valid."
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
  echo ""
  echo "Please fix the errors above and run validation again."
  exit 1
fi
