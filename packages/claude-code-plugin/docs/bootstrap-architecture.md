# Plugin Hook Bootstrap Architecture

> **Status:** current as of `codingbuddy-claude-plugin` v5.4.0
> **Related issues:** [#1380](https://github.com/JeremyDev87/codingbuddy/issues/1380) (this document), [#1376](https://github.com/JeremyDev87/codingbuddy/issues/1376) (parent), [#1381](https://github.com/JeremyDev87/codingbuddy/issues/1381) (stale legacy hook migration)

This document explains **how** and **where** the CodingBuddy Claude Code plugin registers its hooks — and in particular, why `UserPromptSubmit` is nowhere to be found in `hooks/hooks.json`.

If you are here because you opened `hooks/hooks.json`, noticed `UserPromptSubmit` was missing, and thought "this plugin forgot to register PLAN/ACT/EVAL detection" — you are not the first. This page exists to make that confusion impossible.

---

## TL;DR

| Event | Where it is registered | Who loads it |
|-------|------------------------|--------------|
| `SessionStart` | `hooks/hooks.json` (plugin-local) | Claude Code at plugin load time |
| `PreToolUse` | `hooks/hooks.json` (plugin-local) | Claude Code at plugin load time |
| `PostToolUse` | `hooks/hooks.json` (plugin-local) | Claude Code at plugin load time |
| `Stop` | `hooks/hooks.json` (plugin-local) | Claude Code at plugin load time |
| **`UserPromptSubmit`** | **`~/.claude/settings.json`** (installed by `hooks/session-start.py` at runtime) | Claude Code globally, for every session |

`UserPromptSubmit` is intentionally installed **globally** so that PLAN/ACT/EVAL/AUTO keyword detection is active in every Claude Code session, regardless of the current working directory.

---

## The two hook layers

CodingBuddy's plugin ships with two distinct hook registration layers. They serve different purposes and are loaded by Claude Code at different times.

### Layer 1 — plugin-local (`hooks/hooks.json`)

Claude Code's plugin runtime reads `hooks/hooks.json` when the plugin is loaded. Hooks declared here are scoped to **this plugin** — they fire when Claude Code is operating inside a project where the CodingBuddy plugin is active.

This layer declares the hooks that only make sense in a project context:

- **`SessionStart`** — runs `session-start.py`, which in turn bootstraps the global `UserPromptSubmit` layer (see below) along with the status line, MCP entry, and other per-user integrations.
- **`PreToolUse`** — gatekeeps `Bash` commands through `pre-tool-use.py`.
- **`PostToolUse`** — post-processes tool results via `post-tool-use.py`.
- **`Stop`** — saves session stats via `stop.py`.

The file carries a top-level `$comment` field pointing readers to this document. JSON has no comment syntax, so `$comment` is used by convention (JSON Schema follows the same convention).

### Layer 2 — global (`~/.claude/settings.json`, installed by `session-start.py`)

`UserPromptSubmit` is handled differently. On **every** session start, `hooks/session-start.py`:

1. Copies `hooks/user-prompt-submit.py` (and its `lib/` dependencies) into `~/.claude/hooks/codingbuddy-mode-detect.py`.
2. Calls `register_hook_in_settings()` to add a `UserPromptSubmit` entry to `~/.claude/settings.json`, using file locking on Unix to prevent concurrent-write races.

The net effect: once a user has started a Claude Code session with the CodingBuddy plugin installed even once, the PLAN/ACT/EVAL/AUTO keyword hook is registered **globally** and fires in every subsequent session, regardless of project.

---

## Why install `UserPromptSubmit` globally instead of plugin-locally?

This is the first question every reviewer asks, and it is a fair question. A plugin-local entry in `hooks/hooks.json` would be simpler to read and audit.

The reason is **scope of detection**:

- PLAN/ACT/EVAL/AUTO keyword detection is meant to work **any time** the user types those keywords to Claude Code, not only when the current working directory is a CodingBuddy-enabled project.
- Claude Code evaluates plugin-local hooks in the context of the active plugin root, which means a plugin-local `UserPromptSubmit` would only be considered when the plugin is resolved for the current session. That is too narrow for a workflow primitive that should "just work" everywhere.
- A global install mirrors how IDE extensions typically register global keybinding handlers: once installed, they are ambient.

The trade-off is that contributors auditing the plugin package can't tell at a glance where `UserPromptSubmit` lives — which is exactly the confusion that motivated [#1380](https://github.com/JeremyDev87/codingbuddy/issues/1380) and this document.

---

## Source of truth (cheat sheet)

| Question | Answer |
|----------|--------|
| Where is `UserPromptSubmit` registered in the package? | It isn't. It is installed at runtime into `~/.claude/settings.json`. |
| Which file performs the install? | `packages/claude-code-plugin/hooks/session-start.py` — specifically `register_hook_in_settings()`. |
| Which script actually runs on `UserPromptSubmit`? | `~/.claude/hooks/codingbuddy-mode-detect.py`, a copy of `packages/claude-code-plugin/hooks/user-prompt-submit.py`. |
| How is the install idempotent? | `register_hook_in_settings()` calls `_is_hook_in_settings()` first; if a matching entry exists, it is a no-op. |
| How do I confirm the install happened? | Inspect `~/.claude/settings.json` and look for a `hooks.UserPromptSubmit` array entry whose `command` contains `codingbuddy-mode-detect.py`. |

---

## Regression safeguards

Two kinds of drift have happened historically and must be prevented going forward:

1. **Silent removal.** Refactors in `session-start.py` can accidentally delete or short-circuit the global install, leaving keyword detection broken for users who install the plugin fresh.
2. **Duplicate registration.** A contributor who doesn't know about the global install path might "fix" the missing entry by adding `UserPromptSubmit` to `hooks/hooks.json`, producing two competing registrations — one plugin-scoped, one global — with no clear precedence.

The `tests/test_bootstrap_architecture.py` suite locks both invariants:

- `hooks.json` is asserted to declare exactly `{SessionStart, PreToolUse, PostToolUse, Stop}` and to **not** declare `UserPromptSubmit`.
- `hooks.json` must carry a `$comment` field naming `session-start.py`, `UserPromptSubmit`, and `bootstrap-architecture` so readers are redirected here.
- `session-start.py`'s module docstring must mention `UserPromptSubmit` and `~/.claude` so its bootstrap role is discoverable from `head -50`.
- This document must exist, mention both layers, name the global settings path, and reference issue `#1380`.

If you legitimately need to change the architecture, update the tests in the same commit so the invariants move together with the behavior.

---

## Future simplification

An alternative single-path model was considered in [#1380](https://github.com/JeremyDev87/codingbuddy/issues/1380) — move `UserPromptSubmit` into plugin-local `hooks/hooks.json` and delete the global install from `session-start.py`. It was deferred for two reasons:

1. It would break the global-scope semantics described above; PLAN/ACT/EVAL detection would only fire inside CodingBuddy-aware projects.
2. [#1381](https://github.com/JeremyDev87/codingbuddy/issues/1381) already tracks cleaning up **stale** global entries left over by previous plugin versions. Migrating to a single-path model while stale cleanup is still in flight would stack two incompatible migrations on top of each other.

If and when Claude Code grows a first-class mechanism for "global, plugin-originated" hooks, the bootstrap layer here can be retired and this document retracted. Until then, the two-layer model is the deliberate state.

---

## Related files

- `packages/claude-code-plugin/hooks/hooks.json` — plugin-local hook manifest (`$comment` links back here)
- `packages/claude-code-plugin/hooks/session-start.py` — global `UserPromptSubmit` bootstrap (`register_hook_in_settings`)
- `packages/claude-code-plugin/hooks/user-prompt-submit.py` — the actual PLAN/ACT/EVAL keyword detection script
- `packages/claude-code-plugin/tests/test_bootstrap_architecture.py` — invariant tests for this document
- `packages/claude-code-plugin/scripts/migrate-legacy-hooks.js` — stale-entry cleanup (tracked in #1381)
