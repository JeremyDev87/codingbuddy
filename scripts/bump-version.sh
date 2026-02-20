#!/bin/bash
# Usage: ./scripts/bump-version.sh 4.4.0
# Atomically bumps version in all version-bearing files.
set -e

NEW_VERSION="${1}"

# Validate argument
if [ -z "$NEW_VERSION" ]; then
  echo "❌ Error: Version not provided"
  echo "Usage: $0 <new-version>  (e.g. $0 4.4.0)"
  exit 1
fi

# Validate semver format
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "❌ Error: Invalid semver format: '$NEW_VERSION'"
  echo "Expected format: X.Y.Z  (e.g. 4.4.0)"
  exit 1
fi

# Validate CWD — must be run from the project root
if [ ! -f "apps/mcp-server/package.json" ]; then
  echo "❌ Error: Must be run from the project root (apps/mcp-server/package.json not found)"
  echo "Run: ./scripts/bump-version.sh $NEW_VERSION"
  exit 1
fi

echo "🔖 Bumping version to $NEW_VERSION..."

# 1. version.ts (single source of truth for runtime)
node -e "
  const fs = require('fs');
  const p = 'apps/mcp-server/src/shared/version.ts';
  const content = fs.readFileSync(p, 'utf-8');
  const updated = content.replace(/export const VERSION = '.*';/, \"export const VERSION = '$NEW_VERSION';\");
  fs.writeFileSync(p, updated);
"
echo "  ✅ apps/mcp-server/src/shared/version.ts"

# 2. apps/mcp-server/package.json
node -e "
  const fs = require('fs');
  const p = 'apps/mcp-server/package.json';
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
"
echo "  ✅ apps/mcp-server/package.json"

# 3. packages/rules/package.json
node -e "
  const fs = require('fs');
  const p = 'packages/rules/package.json';
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
"
echo "  ✅ packages/rules/package.json"

# 4. packages/claude-code-plugin/package.json
node -e "
  const fs = require('fs');
  const p = 'packages/claude-code-plugin/package.json';
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  pkg.version = '$NEW_VERSION';
  if (pkg.peerDependencies && pkg.peerDependencies.codingbuddy) {
    pkg.peerDependencies.codingbuddy = '^$NEW_VERSION';
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
"
echo "  ✅ packages/claude-code-plugin/package.json"

# 5. packages/claude-code-plugin/.claude-plugin/plugin.json
node -e "
  const fs = require('fs');
  const p = 'packages/claude-code-plugin/.claude-plugin/plugin.json';
  const plugin = JSON.parse(fs.readFileSync(p, 'utf-8'));
  plugin.version = '$NEW_VERSION';
  fs.writeFileSync(p, JSON.stringify(plugin, null, 2) + '\n');
"
echo "  ✅ packages/claude-code-plugin/.claude-plugin/plugin.json"

echo ""
echo "✅ All files bumped to v$NEW_VERSION"
echo "   Next: git commit -am \"chore(release): prepare v$NEW_VERSION\""
