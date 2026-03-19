#!/bin/bash
set -e

# Verify that all package.json versions match the git tag
# Usage: ./scripts/verify-release-versions.sh v4.0.1

TAG_VERSION="${1#v}"  # v4.0.1 → 4.0.1

if [ -z "$TAG_VERSION" ]; then
  echo "❌ Error: Tag version not provided"
  echo "Usage: $0 <tag-version>"
  exit 1
fi

echo "🔍 Verifying all version files match git tag: v$TAG_VERSION"
echo ""

# Check version.ts (single source of truth for runtime version)
VERSION_TS_FILE="apps/mcp-server/src/shared/version.ts"
if [ ! -f "$VERSION_TS_FILE" ]; then
  echo "❌ File not found: $VERSION_TS_FILE"
  ALL_MATCH=false
else
  ts_version=$(node -e "
    const content = require('fs').readFileSync('$VERSION_TS_FILE', 'utf-8');
    const match = content.match(/export const VERSION = '(.*)';/);
    console.log(match ? match[1] : '');
  ")
  if [ "$ts_version" = "$TAG_VERSION" ]; then
    echo "✅ version.ts VERSION: $ts_version (matches tag)"
  else
    echo "❌ version.ts VERSION: $ts_version (tag is v$TAG_VERSION)"
    ALL_MATCH=false
  fi
fi

PACKAGES=(
  "apps/mcp-server/package.json:codingbuddy"
  "packages/rules/package.json:codingbuddy-rules"
  "packages/claude-code-plugin/package.json:codingbuddy-claude-plugin"
)

ALL_MATCH=true

for package_info in "${PACKAGES[@]}"; do
  IFS=':' read -r path name <<< "$package_info"

  if [ ! -f "$path" ]; then
    echo "❌ File not found: $path"
    ALL_MATCH=false
    continue
  fi

  # Read the original version from package.json (before workflow modifications)
  pkg_version=$(jq -r '.version' "$path")

  if [ "$pkg_version" = "$TAG_VERSION" ]; then
    echo "✅ $name: $pkg_version (matches tag)"
  else
    echo "❌ $name: $pkg_version (tag is v$TAG_VERSION)"
    ALL_MATCH=false
  fi
done

# Check .mcp.json (gitignored, local only)
if [ -f ".mcp.json" ]; then
  mcp_version=$(node -e "
    const content = require('fs').readFileSync('.mcp.json', 'utf-8');
    const match = content.match(/codingbuddy@([0-9]+\.[0-9]+\.[0-9]+)/);
    console.log(match ? match[1] : '');
  ")
  if [ "$mcp_version" = "$TAG_VERSION" ]; then
    echo "✅ .mcp.json codingbuddy: @$mcp_version (matches tag)"
  else
    echo "❌ .mcp.json codingbuddy: @$mcp_version (tag is v$TAG_VERSION)"
    ALL_MATCH=false
  fi
else
  echo "⏭️  .mcp.json (not found, skipped)"
fi

echo ""

if [ "$ALL_MATCH" = true ]; then
  echo "✅ All package versions match tag v$TAG_VERSION"
  echo "   Safe to proceed with publish"
  exit 0
else
  echo "❌ Version mismatch detected!"
  echo ""
  echo "This means package.json files were not updated before creating the tag."
  echo ""
  echo "To fix:"
  echo "  1. Delete the tag: git tag -d v$TAG_VERSION && git push origin :v$TAG_VERSION"
  echo "  2. Update all package.json files to version $TAG_VERSION"
  echo "  3. Run: yarn workspace codingbuddy-claude-plugin sync-version"
  echo "  4. Update .mcp.json to codingbuddy@$TAG_VERSION"
  echo "  5. Commit: git commit -am 'chore: bump version to $TAG_VERSION'"
  echo "  6. Recreate tag: git tag v$TAG_VERSION && git push origin master v$TAG_VERSION"
  exit 1
fi
