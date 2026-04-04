# Command Migration Guide

## Overview

CodingBuddy is migrating from bare slash commands (`/plan`, `/act`, etc.) to namespaced commands (`/codingbuddy:plan`, `/codingbuddy:act`, etc.) to prevent collisions with Claude Code built-in commands.

**Bare commands continue to work during the transition period.** No immediate action is required.

## Recommended: Use Keywords Instead

The lowest-friction workflow uses **keywords** — plain text typed at the start of your message. Keywords are not slash commands and require no namespace:

| Keyword  | Effect                              |
| -------- | ----------------------------------- |
| `PLAN`   | Enter planning mode                 |
| `ACT`    | Enter implementation mode           |
| `EVAL`   | Enter evaluation mode               |
| `AUTO`   | Enter autonomous PLAN/ACT/EVAL cycle |

**Examples:**

```
PLAN design auth feature
ACT implement the login form
EVAL review the auth module
AUTO build user dashboard
```

Keywords also support localized variants: Korean (`계획`/`실행`/`평가`/`자동`), Japanese (`計画`/`実行`/`評価`/`自動`), Chinese (`计划`/`执行`/`评估`/`自动`), Spanish (`PLANIFICAR`/`ACTUAR`/`EVALUAR`/`AUTOMÁTICO`).

## Command Mapping

If you prefer slash commands, use the namespaced form:

| Legacy (bare)  | Namespaced (canonical)     | Status   |
| -------------- | -------------------------- | -------- |
| `/plan`        | `/codingbuddy:plan`        | complete |
| `/act`         | `/codingbuddy:act`         | complete |
| `/eval`        | `/codingbuddy:eval`        | complete |
| `/auto`        | `/codingbuddy:auto`        | complete |
| `/buddy`       | `/codingbuddy:buddy`       | complete |
| `/checklist`   | `/codingbuddy:checklist`   | complete |

## Timeline

1. **Complete**: All commands are namespaced as `codingbuddy:*`. Claude Code resolves them via `plugin.json` name + `commands/` filenames. Keywords remain the recommended entry point.
2. **Bare aliases**: Legacy bare commands (`/plan`, `/act`, etc.) continue to work. New commands use `codingbuddy:*` only.
3. **Future**: Once Claude Code drops bare-alias resolution, legacy bare filenames may be removed.

## What Changed and Why

Claude Code reserves certain command names as built-ins (e.g., `/help`, `/clear`, `/review`). To avoid collisions and clearly identify CodingBuddy functionality, all plugin commands now use the `codingbuddy:` namespace prefix.

See [namespace-policy.md](./namespace-policy.md) for the full policy.

## FAQ

**Q: Do I need to change anything right now?**
A: No. Bare commands still work. Switch to keywords or namespaced commands at your convenience.

**Q: What is the recommended approach?**
A: Use keywords (`PLAN`, `ACT`, `EVAL`, `AUTO`). They are the fastest and most portable workflow entry point.

**Q: Will new commands have bare aliases?**
A: No. All new commands use the `codingbuddy:*` namespace exclusively.
