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

| Legacy (bare)  | Namespaced (new)           | Status           |
| -------------- | -------------------------- | ---------------- |
| `/plan`        | `/codingbuddy:plan`        | migration target |
| `/act`         | `/codingbuddy:act`         | migration target |
| `/eval`        | `/codingbuddy:eval`        | migration target |
| `/auto`        | `/codingbuddy:auto`        | migration target |
| `/buddy`       | `/codingbuddy:buddy`       | migration target |
| `/checklist`   | `/codingbuddy:checklist`   | migration target |

## Timeline

1. **Now**: Both bare and namespaced commands work. Keywords are the recommended entry point.
2. **Transition**: Bare commands are deprecated but functional. New commands use `codingbuddy:*` only.
3. **Future**: Once Claude Code fully supports `plugin:command` namespace resolution, bare aliases will be removed.

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
