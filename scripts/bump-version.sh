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

# 6. .claude-plugin/marketplace.json (plugins[0].version)
node -e "
  const fs = require('fs');
  const p = '.claude-plugin/marketplace.json';
  const mkt = JSON.parse(fs.readFileSync(p, 'utf-8'));
  mkt.plugins[0].version = '$NEW_VERSION';
  fs.writeFileSync(p, JSON.stringify(mkt, null, 2) + '\n');
"
echo "  ✅ .claude-plugin/marketplace.json"

# 7. .mcp.json (if exists — gitignored, local only)
if [ -f ".mcp.json" ]; then
  node -e "
    const fs = require('fs');
    const p = '.mcp.json';
    const content = fs.readFileSync(p, 'utf-8');
    const updated = content.replace(/codingbuddy@[0-9]+\.[0-9]+\.[0-9]+/, 'codingbuddy@$NEW_VERSION');
    fs.writeFileSync(p, updated);
  "
  echo "  ✅ .mcp.json"
else
  echo "  ⏭️  .mcp.json (not found, skipped)"
fi

# 8. Update lockfile (peerDependencies changed)
echo ""
echo "🔒 Updating lockfile..."
yarn install
echo "  ✅ yarn.lock"

# 9. Verify all version files match
echo ""
echo "════════════════════════════════════════════"
echo "🔍 Verification"
echo "════════════════════════════════════════════"

ERRORS=0

grep -q "\"version\": \"$NEW_VERSION\"" apps/mcp-server/package.json && echo "  ✅ mcp-server/package.json" || { echo "  ❌ mcp-server/package.json"; ERRORS=$((ERRORS+1)); }
grep -q "VERSION = '$NEW_VERSION'" apps/mcp-server/src/shared/version.ts && echo "  ✅ version.ts" || { echo "  ❌ version.ts"; ERRORS=$((ERRORS+1)); }
grep -q "\"version\": \"$NEW_VERSION\"" packages/rules/package.json && echo "  ✅ rules/package.json" || { echo "  ❌ rules/package.json"; ERRORS=$((ERRORS+1)); }
grep -q "\"version\": \"$NEW_VERSION\"" packages/claude-code-plugin/package.json && echo "  ✅ plugin/package.json" || { echo "  ❌ plugin/package.json"; ERRORS=$((ERRORS+1)); }
grep -q "\"version\": \"$NEW_VERSION\"" packages/claude-code-plugin/.claude-plugin/plugin.json && echo "  ✅ plugin.json" || { echo "  ❌ plugin.json"; ERRORS=$((ERRORS+1)); }
grep -q "\"version\": \"$NEW_VERSION\"" .claude-plugin/marketplace.json && echo "  ✅ marketplace.json" || { echo "  ❌ marketplace.json"; ERRORS=$((ERRORS+1)); }
git diff --quiet yarn.lock && echo "  ✅ yarn.lock clean" || { echo "  ❌ yarn.lock has uncommitted changes"; ERRORS=$((ERRORS+1)); }

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ Verification failed with $ERRORS error(s). DO NOT commit."
  exit 1
fi

echo "✅ All files bumped to v$NEW_VERSION (including yarn.lock)"
echo ""
echo "Next steps:"
echo "  git add -A"
echo "  git commit -m \"chore: prepare v$NEW_VERSION release\""
echo "  # Create PR, wait for CI, merge"
echo "  # Then: git tag v$NEW_VERSION && git push origin v$NEW_VERSION"
