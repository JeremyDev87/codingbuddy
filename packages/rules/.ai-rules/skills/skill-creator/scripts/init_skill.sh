#!/usr/bin/env bash
# init_skill.sh — Scaffold a new skill directory with SKILL.md template.
#
# Usage:
#   ./init_skill.sh <skill-name> [--path <dir>] [--help]
#
# Example:
#   ./init_skill.sh my-awesome-skill
#   ./init_skill.sh my-awesome-skill --path /custom/skills/dir
#
# Creates:
#   <dir>/<skill-name>/
#   ├── SKILL.md          # Skill template with frontmatter
#   └── references/       # Supporting files directory

set -euo pipefail

VERSION="1.0.0"

# ──────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────

usage() {
    cat <<'HELP'
init_skill.sh — Scaffold a new skill directory

USAGE
    ./init_skill.sh <skill-name> [OPTIONS]

ARGUMENTS
    skill-name    Skill name in kebab-case (e.g. my-awesome-skill)
                  Must start with a letter, contain only lowercase
                  letters, digits, and hyphens.

OPTIONS
    --path <dir>  Parent directory for the skill (default: current directory)
    --help        Show this help message
    --version     Show version

EXAMPLES
    ./init_skill.sh test-driven-development
    ./init_skill.sh my-skill --path ./skills
    ./init_skill.sh code-review --path /absolute/path/to/skills

OUTPUT
    Creates the following structure:

    <skill-name>/
    ├── SKILL.md          Skill definition with frontmatter template
    └── references/       Directory for supporting files
HELP
}

# ──────────────────────────────────────────────
# Argument parsing
# ──────────────────────────────────────────────

SKILL_NAME=""
PARENT_DIR="."

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            usage
            exit 0
            ;;
        --version|-v)
            echo "init_skill.sh v${VERSION}"
            exit 0
            ;;
        --path)
            if [[ -z "${2:-}" ]]; then
                echo "[ERROR] --path requires a directory argument" >&2
                exit 1
            fi
            PARENT_DIR="$2"
            shift 2
            ;;
        -*)
            echo "[ERROR] Unknown option: $1" >&2
            echo "Run './init_skill.sh --help' for usage." >&2
            exit 1
            ;;
        *)
            if [[ -n "$SKILL_NAME" ]]; then
                echo "[ERROR] Unexpected argument: $1" >&2
                echo "Only one skill name is allowed." >&2
                exit 1
            fi
            SKILL_NAME="$1"
            shift
            ;;
    esac
done

# ──────────────────────────────────────────────
# Validation
# ──────────────────────────────────────────────

if [[ -z "$SKILL_NAME" ]]; then
    echo "[ERROR] Skill name is required." >&2
    echo "Run './init_skill.sh --help' for usage." >&2
    exit 1
fi

# Validate kebab-case: starts with letter, lowercase + digits + hyphens only
if ! echo "$SKILL_NAME" | grep -qE '^[a-z][a-z0-9-]*$'; then
    echo "[ERROR] Invalid skill name: '$SKILL_NAME'" >&2
    echo "Must be kebab-case: start with a letter, contain only lowercase letters, digits, and hyphens." >&2
    exit 1
fi

if [[ ! -d "$PARENT_DIR" ]]; then
    echo "[ERROR] Parent directory does not exist: $PARENT_DIR" >&2
    exit 1
fi

SKILL_DIR="${PARENT_DIR}/${SKILL_NAME}"

# Prevent overwriting existing directory
if [[ -d "$SKILL_DIR" ]]; then
    echo "[ERROR] Directory already exists: $SKILL_DIR" >&2
    echo "Remove it first or choose a different name." >&2
    exit 1
fi

# ──────────────────────────────────────────────
# Scaffold
# ──────────────────────────────────────────────

mkdir -p "${SKILL_DIR}/references" "${SKILL_DIR}/examples" "${SKILL_DIR}/scripts"

cat > "${SKILL_DIR}/SKILL.md" <<TEMPLATE
---
name: ${SKILL_NAME}
description: >-
  TODO: One-line description of what this skill does and when to use it.
  Be specific — this text drives trigger matching in recommend_skills.
---

# ${SKILL_NAME}

## Overview

TODO: Brief explanation of the problem this skill solves.

**Core principle:** TODO: The single most important rule this skill enforces.

**Iron Law:**
\`\`\`
TODO: The non-negotiable constraint. One line.
\`\`\`

## When to Use

- TODO: Specific scenario 1
- TODO: Specific scenario 2
- TODO: Specific scenario 3

## When NOT to Use

- TODO: Anti-scenario 1
- TODO: Anti-scenario 2

## Process

### Phase 1: TODO

1. Step 1
2. Step 2
3. Step 3

### Phase 2: TODO

1. Step 1
2. Step 2
3. Step 3

## Checklist

- [ ] TODO: Verification item 1
- [ ] TODO: Verification item 2
- [ ] TODO: Verification item 3
TEMPLATE

echo "[OK] Skill scaffolded: ${SKILL_DIR}"
echo "     - ${SKILL_DIR}/SKILL.md"
echo "     - ${SKILL_DIR}/references/"
echo "     - ${SKILL_DIR}/examples/"
echo "     - ${SKILL_DIR}/scripts/"
echo ""
echo "Next steps:"
echo "  1. Edit ${SKILL_DIR}/SKILL.md — fill in the TODOs"
echo "  2. Add supporting files to ${SKILL_DIR}/references/"
echo "  3. Test with: recommend_skills(prompt='your test prompt')"
