#!/bin/bash
# AI Rules Validation Script
# Validates the common AI rules structure, JSON schema, and Markdown linting

set -e

echo "🔍 Validating AI Rules..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Parse arguments
SCHEMA_ONLY=false
MARKDOWN_ONLY=false
SKIP_SCHEMA=false
SKIP_MARKDOWN=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --schema-only) SCHEMA_ONLY=true ;;
    --markdown-only) MARKDOWN_ONLY=true ;;
    --skip-schema) SKIP_SCHEMA=true ;;
    --skip-markdown) SKIP_MARKDOWN=true ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --schema-only    Run only JSON schema validation"
      echo "  --markdown-only  Run only Markdown linting"
      echo "  --skip-schema    Skip JSON schema validation"
      echo "  --skip-markdown  Skip Markdown linting"
      echo "  -h, --help       Show this help message"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# ─────────────────────────────────────────────────────────────────────────────
# Section 1: Directory Structure Validation
# ─────────────────────────────────────────────────────────────────────────────

if [ "$SCHEMA_ONLY" = false ] && [ "$MARKDOWN_ONLY" = false ]; then
  echo "📁 Checking Directory Structure..."
  echo ""

  # Check .ai-rules directory exists
  if [ ! -d ".ai-rules" ]; then
    echo -e "${RED}❌ .ai-rules/ directory not found${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ .ai-rules/ directory exists${NC}"

  # Check subdirectories exist
  for dir in rules agents adapters schemas; do
    if [ ! -d ".ai-rules/$dir" ]; then
      if [ "$dir" = "schemas" ]; then
        echo -e "${YELLOW}⚠️  .ai-rules/$dir/ directory not found (optional)${NC}"
      else
        echo -e "${RED}❌ .ai-rules/$dir/ directory not found${NC}"
        ((ERRORS++))
      fi
    else
      echo -e "${GREEN}✅ .ai-rules/$dir/ directory exists${NC}"
    fi
  done

  echo ""
  echo "📚 Checking Core Rule Files..."

  # Check required rule files
  for rule in core.md project.md augmented-coding.md; do
    if [ ! -f ".ai-rules/rules/$rule" ]; then
      echo -e "${RED}❌ Missing rule: .ai-rules/rules/$rule${NC}"
      ((ERRORS++))
    else
      if [ ! -s ".ai-rules/rules/$rule" ]; then
        echo -e "${RED}❌ Empty rule file: .ai-rules/rules/$rule${NC}"
        ((ERRORS++))
      else
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
    "backend-developer"
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
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 2: JSON Schema Validation
# ─────────────────────────────────────────────────────────────────────────────

if [ "$MARKDOWN_ONLY" = false ] && [ "$SKIP_SCHEMA" = false ]; then
  echo "📋 Running JSON Schema Validation..."
  echo ""

  SCHEMA_FILE=".ai-rules/schemas/agent.schema.json"

  if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${YELLOW}⚠️  Schema file not found: $SCHEMA_FILE${NC}"
    echo -e "${YELLOW}   Skipping schema validation${NC}"
  else
    # Check if ajv-cli is available via yarn dlx
    if yarn dlx ajv-cli validate -s "$SCHEMA_FILE" -d ".ai-rules/agents/*.json" --spec=draft7 2>&1 | grep -q "valid"; then
      SCHEMA_RESULTS=$(yarn dlx ajv-cli validate -s "$SCHEMA_FILE" -d ".ai-rules/agents/*.json" --spec=draft7 2>&1)
      INVALID_COUNT=$(echo "$SCHEMA_RESULTS" | grep -c "invalid" || true)

      if [ "$INVALID_COUNT" -gt 0 ]; then
        echo -e "${RED}❌ Schema validation failed:${NC}"
        echo "$SCHEMA_RESULTS" | grep -A5 "invalid"
        ERRORS=$((ERRORS + INVALID_COUNT))
      else
        echo -e "${GREEN}✅ All agent files pass schema validation${NC}"
      fi
    else
      echo -e "${RED}❌ ajv-cli validation failed${NC}"
      ((ERRORS++))
    fi
  fi

  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# Section 3: Markdown Linting
# ─────────────────────────────────────────────────────────────────────────────

if [ "$SCHEMA_ONLY" = false ] && [ "$SKIP_MARKDOWN" = false ]; then
  echo "📝 Running Markdown Linting..."
  echo ""

  if [ ! -f ".markdownlint.json" ]; then
    echo -e "${YELLOW}⚠️  .markdownlint.json not found${NC}"
    echo -e "${YELLOW}   Skipping Markdown linting${NC}"
  else
    # Run markdownlint
    LINT_OUTPUT=$(yarn dlx markdownlint-cli2 ".ai-rules/**/*.md" 2>&1 || true)
    LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep "error(s)" | grep -oE "[0-9]+" | head -1 || echo "0")

    if [ "$LINT_ERRORS" -gt 0 ]; then
      echo -e "${RED}❌ Markdown linting found $LINT_ERRORS error(s):${NC}"
      echo "$LINT_OUTPUT" | grep -E "^\.ai-rules.*error"
      ERRORS=$((ERRORS + LINT_ERRORS))
    else
      echo -e "${GREEN}✅ All Markdown files pass linting${NC}"
    fi
  fi

  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All validation checks passed!${NC}"
  echo ""
  echo "AI Rules validation complete."
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
  echo ""
  echo "Please fix the errors above and run validation again."
  exit 1
fi
