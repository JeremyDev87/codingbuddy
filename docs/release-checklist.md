# Release Checklist

Mandatory checklist for version bump and release. **Every version bump MUST follow this checklist.**

> **Incident (v5.2.0):** `version.ts` and `plugin/package.json` were not bumped. CI caught the mismatch.
> **Incident (v5.3.0):** `sync-version` changed `peerDependencies` but `yarn install` was not run, so `yarn.lock` was stale. CI `--immutable` rejected it.

## Version Files — Complete List

All files below MUST have matching versions. **Missing even one will fail the release CI.**

| # | File | Purpose | Auto-sync? |
|---|------|---------|-----------|
| 1 | `apps/mcp-server/package.json` | MCP server version (primary source) | Manual |
| 2 | `apps/mcp-server/src/shared/version.ts` | Runtime VERSION constant | Manual |
| 3 | `packages/rules/package.json` | Rules package version | Manual |
| 4 | `packages/claude-code-plugin/package.json` | Plugin package version | `sync-version` / `bump-version.sh` |
| 5 | `packages/claude-code-plugin/.claude-plugin/plugin.json` | Plugin manifest version | `sync-version` / `bump-version.sh` |
| 6 | `.claude-plugin/marketplace.json` | Marketplace listing version | `bump-version.sh` |
| — | `yarn.lock` | Lockfile (peerDependencies change) | `yarn install` after sync |

## Recommended: One-Command Bump

```bash
./scripts/bump-version.sh X.Y.Z
```

This script performs Steps 1–5 automatically:
- Bumps all version files (package.json x3 + version.ts + plugin.json + marketplace.json)
- Updates peerDependencies
- Runs `yarn install` to update lockfile
- Verifies all files match

After the script succeeds, proceed to Step 6 (Commit + PR).

---

## Manual Bump Procedure (if not using the script)

### Step 1: Bump primary source

Edit `apps/mcp-server/package.json` → update `version` field.

### Step 2: Bump version.ts

Edit `apps/mcp-server/src/shared/version.ts` → update `VERSION` constant.

### Step 3: Bump rules package

Edit `packages/rules/package.json` → update `version` field.

### Step 4: Run sync-version

```bash
yarn workspace codingbuddy-claude-plugin sync-version
```

This automatically syncs:
- `packages/claude-code-plugin/package.json` (version + peerDependencies)
- `packages/claude-code-plugin/.claude-plugin/plugin.json` (version)

### Step 4.5: Update lockfile — MANDATORY

```bash
yarn install
```

`sync-version` changes `peerDependencies`, which requires a lockfile update.
CI runs with `--immutable` and will reject stale lockfiles.

### Step 5: Verify — MANDATORY

```bash
# Run this BEFORE committing. All must show the same version.
VERSION="X.Y.Z"
echo "Checking all version files for $VERSION..."

grep -q "\"version\": \"$VERSION\"" apps/mcp-server/package.json && echo "✅ mcp-server" || echo "❌ mcp-server"
grep -q "VERSION = '$VERSION'" apps/mcp-server/src/shared/version.ts && echo "✅ version.ts" || echo "❌ version.ts"
grep -q "\"version\": \"$VERSION\"" packages/rules/package.json && echo "✅ rules" || echo "❌ rules"
grep -q "\"version\": \"$VERSION\"" packages/claude-code-plugin/package.json && echo "✅ plugin pkg" || echo "❌ plugin pkg"
grep -q "\"version\": \"$VERSION\"" packages/claude-code-plugin/.claude-plugin/plugin.json && echo "✅ plugin manifest" || echo "❌ plugin manifest"

# No remaining old version
grep -rn "OLD_VERSION" --include="*.ts" --include="*.json" apps/ packages/ | grep -v node_modules | grep -v CHANGELOG && echo "❌ OLD VERSION FOUND" || echo "✅ Clean"

# Lockfile is up to date (no uncommitted changes after yarn install)
git diff --quiet yarn.lock && echo "✅ yarn.lock clean" || echo "❌ yarn.lock has uncommitted changes — run yarn install and stage it"
```

### Step 6: Commit + PR

```bash
git add -A
git commit -m "chore: bump version to X.Y.Z"
# Create PR, wait for CI, merge
```

### Step 7: Tag (user only)

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Common Mistakes

| Mistake | Prevention |
|---------|-----------|
| Forgot `version.ts` | Step 2 is explicit — version.ts is separate from package.json |
| Forgot `plugin/package.json` | Step 4 `sync-version` handles this automatically |
| Forgot to run `sync-version` | Step 4 is a separate explicit step |
| Stale `yarn.lock` after sync-version | Step 4.5 `yarn install` updates lockfile after peerDependencies change |
| Version mismatch between files | Step 5 verification catches this |
| Old version remains in codebase | Step 5 grep check catches this |

## CI Validation

The `release.yml` workflow validates all version files match the git tag.
If any mismatch is found, the release fails with a clear error message listing which files are wrong.
