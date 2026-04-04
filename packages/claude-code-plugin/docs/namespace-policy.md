# CodingBuddy Namespace Policy

## Policy Statement

CodingBuddy does **NOT** ship new bare top-level slash commands. All future commands use the `codingbuddy:*` namespace. Existing bare commands will be migrated to namespaced equivalents.

This policy prevents collisions with Claude Code built-in commands and clearly identifies CodingBuddy-owned functionality.

## Canonical Command Mapping

| Legacy (bare) | Namespaced              | Status           |
| ------------- | ----------------------- | ---------------- |
| `/plan`       | `/codingbuddy:plan`     | migration target |
| `/act`        | `/codingbuddy:act`      | migration target |
| `/eval`       | `/codingbuddy:eval`     | migration target |
| `/auto`       | `/codingbuddy:auto`     | migration target |
| `/buddy`      | `/codingbuddy:buddy`    | migration target |
| `/checklist`  | `/codingbuddy:checklist` | migration target |

### Migration Notes

- Legacy bare commands remain functional during the transition period.
- Once Claude Code fully supports the `plugin:command` namespace resolution, bare aliases will be removed.
- Both forms invoke the same underlying command file in `commands/`.

## Keyword Workflow Retention

The following keywords remain as primary workflow shortcuts:

- **PLAN** — enter planning mode
- **ACT** — enter implementation mode
- **EVAL** — enter evaluation mode
- **AUTO** — enter autonomous cycle mode

Keywords are **NOT** slash commands. They are workflow triggers detected by hooks and `parse_mode`. Keywords do not collide with any Claude Code namespace and require no migration.

## Policy for New Commands

1. All new commands **MUST** use the `codingbuddy:` prefix.
2. No exceptions for "convenient" short names.
3. Command files are placed in `commands/` and automatically discovered by the plugin system.
4. The namespaced form (`codingbuddy:<name>`) is the canonical invocation.
