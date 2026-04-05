"""Bootstrap architecture regression tests (#1380).

These tests lock in the architectural invariants for how CodingBuddy's
``UserPromptSubmit`` hook is registered with Claude Code.

Background
----------
The plugin intentionally uses **two** distinct hook layers:

1. **plugin-local** ``hooks/hooks.json`` — bundled with the plugin and
   registers the hooks Claude Code loads directly from the plugin package
   (``SessionStart``, ``PreToolUse``, ``PostToolUse``, ``Stop``).
2. **SessionStart-driven global install** — at session start,
   ``hooks/session-start.py`` copies ``user-prompt-submit.py`` into
   ``~/.claude/hooks/`` and registers a ``UserPromptSubmit`` hook entry
   in the user's global ``~/.claude/settings.json``.

Because the global install path is what actually wires up
``UserPromptSubmit`` today, ``hooks/hooks.json`` deliberately does **not**
declare a ``UserPromptSubmit`` entry. Contributors reading ``hooks.json``
for the first time have mistaken this for a missing registration.

These tests exist to:

* prevent regressions where ``UserPromptSubmit`` silently drifts between
  layers (e.g. accidentally removed from ``session-start.py`` OR
  accidentally added to ``hooks.json`` without updating the bootstrap
  documentation),
* keep the in-repo documentation (``$comment`` in ``hooks.json`` plus
  ``docs/bootstrap-architecture.md``) synchronized with the actual
  bootstrap path.

If you intentionally migrate to a single-path model (see #1380 and the
``Approach B`` notes), update these tests **and** ``bootstrap-architecture.md``
in the same change.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest


PLUGIN_ROOT = Path(__file__).resolve().parent.parent
HOOKS_DIR = PLUGIN_ROOT / "hooks"
DOCS_DIR = PLUGIN_ROOT / "docs"

HOOKS_JSON_PATH = HOOKS_DIR / "hooks.json"
SESSION_START_PATH = HOOKS_DIR / "session-start.py"
USER_PROMPT_SUBMIT_PATH = HOOKS_DIR / "user-prompt-submit.py"
BOOTSTRAP_DOC_PATH = DOCS_DIR / "bootstrap-architecture.md"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def hooks_json() -> dict:
    """Parsed contents of the plugin-local hooks.json manifest."""
    with open(HOOKS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def session_start_source() -> str:
    """Raw source of hooks/session-start.py."""
    with open(SESSION_START_PATH, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture(scope="module")
def bootstrap_doc() -> str:
    """Raw contents of docs/bootstrap-architecture.md."""
    with open(BOOTSTRAP_DOC_PATH, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# hooks.json invariants
# ---------------------------------------------------------------------------


class TestHooksJsonStructure:
    """Invariants for plugin-local ``hooks/hooks.json``."""

    def test_hooks_json_exists(self) -> None:
        assert HOOKS_JSON_PATH.is_file(), (
            f"hooks.json must exist at {HOOKS_JSON_PATH}"
        )

    def test_hooks_json_is_valid_json(self, hooks_json: dict) -> None:
        assert isinstance(hooks_json, dict)

    def test_hooks_json_declares_expected_events(self, hooks_json: dict) -> None:
        """Plugin-local layer registers exactly the events Claude Code loads directly.

        ``UserPromptSubmit`` is intentionally absent — it is installed by
        ``session-start.py`` into the user's global settings at runtime.
        """
        events = hooks_json.get("hooks", {})
        expected_events = {"SessionStart", "PreToolUse", "PostToolUse", "Stop"}
        assert set(events.keys()) == expected_events, (
            "hooks.json must declare exactly "
            f"{sorted(expected_events)}. Got: {sorted(events.keys())}"
        )

    def test_hooks_json_does_not_declare_user_prompt_submit(
        self, hooks_json: dict
    ) -> None:
        """``UserPromptSubmit`` must not appear in plugin-local hooks.json.

        If you are intentionally migrating to a single-path model, remove
        the global install from session-start.py **in the same change**
        and update ``docs/bootstrap-architecture.md``. See #1380.
        """
        events = hooks_json.get("hooks", {})
        assert "UserPromptSubmit" not in events, (
            "UserPromptSubmit must not live in plugin-local hooks.json — "
            "session-start.py installs it globally. See "
            "docs/bootstrap-architecture.md for rationale."
        )


class TestHooksJsonBootstrapComment:
    """hooks.json must carry an inline pointer to the bootstrap docs.

    JSON has no comment syntax, so we use the ``$comment`` convention
    (also used by JSON Schema) to leave a contributor-facing note.
    """

    def test_hooks_json_has_bootstrap_comment(self, hooks_json: dict) -> None:
        assert "$comment" in hooks_json, (
            "hooks.json must include a top-level $comment field pointing "
            "contributors at the bootstrap architecture docs."
        )

    def test_bootstrap_comment_mentions_session_start(
        self, hooks_json: dict
    ) -> None:
        comment = hooks_json.get("$comment", "")
        assert isinstance(comment, str)
        assert "session-start.py" in comment, (
            "$comment must name session-start.py as the source of truth "
            "for UserPromptSubmit installation."
        )

    def test_bootstrap_comment_mentions_user_prompt_submit(
        self, hooks_json: dict
    ) -> None:
        comment = hooks_json.get("$comment", "")
        assert "UserPromptSubmit" in comment, (
            "$comment must explicitly mention UserPromptSubmit so "
            "contributors understand why it's missing from this file."
        )

    def test_bootstrap_comment_references_doc(self, hooks_json: dict) -> None:
        comment = hooks_json.get("$comment", "")
        assert "bootstrap-architecture" in comment, (
            "$comment must point readers to docs/bootstrap-architecture.md."
        )


# ---------------------------------------------------------------------------
# session-start.py invariants
# ---------------------------------------------------------------------------


class TestSessionStartBootstrap:
    """session-start.py is the source of truth for global UserPromptSubmit."""

    def test_session_start_exists(self) -> None:
        assert SESSION_START_PATH.is_file()

    def test_user_prompt_submit_source_exists(self) -> None:
        """The hook source copied into ~/.claude/hooks/ must ship with the plugin."""
        assert USER_PROMPT_SUBMIT_PATH.is_file(), (
            "user-prompt-submit.py must exist so session-start.py can "
            "copy it into ~/.claude/hooks/."
        )

    def test_session_start_references_user_prompt_submit(
        self, session_start_source: str
    ) -> None:
        assert "user-prompt-submit.py" in session_start_source, (
            "session-start.py must reference user-prompt-submit.py as "
            "the source file for the global hook install."
        )

    def test_session_start_registers_user_prompt_submit_event(
        self, session_start_source: str
    ) -> None:
        """The global install logic must target the UserPromptSubmit event."""
        assert "UserPromptSubmit" in session_start_source, (
            "session-start.py must contain the global UserPromptSubmit "
            "registration logic."
        )

    def test_session_start_documents_bootstrap_role(
        self, session_start_source: str
    ) -> None:
        """Module docstring must explain the bootstrap responsibility."""
        # Extract the module docstring (first triple-quoted block).
        start = session_start_source.find('"""')
        assert start != -1, "session-start.py must have a module docstring"
        end = session_start_source.find('"""', start + 3)
        assert end != -1, "session-start.py module docstring is unterminated"
        docstring = session_start_source[start:end].lower()

        # The docstring should explain why this file installs a global hook.
        assert "userpromptsubmit" in docstring, (
            "session-start.py docstring must mention UserPromptSubmit so "
            "its bootstrap role is discoverable from a casual read."
        )
        assert "~/.claude" in docstring or ".claude/settings.json" in docstring, (
            "session-start.py docstring must mention the global settings "
            "location it writes to."
        )


# ---------------------------------------------------------------------------
# Bootstrap documentation invariants
# ---------------------------------------------------------------------------


class TestBootstrapDocumentation:
    """docs/bootstrap-architecture.md is the long-form source of truth."""

    def test_bootstrap_doc_exists(self) -> None:
        assert BOOTSTRAP_DOC_PATH.is_file(), (
            f"Bootstrap architecture doc must exist at {BOOTSTRAP_DOC_PATH}"
        )

    def test_bootstrap_doc_mentions_both_layers(self, bootstrap_doc: str) -> None:
        assert "hooks.json" in bootstrap_doc
        assert "session-start.py" in bootstrap_doc

    def test_bootstrap_doc_mentions_user_prompt_submit(
        self, bootstrap_doc: str
    ) -> None:
        assert "UserPromptSubmit" in bootstrap_doc

    def test_bootstrap_doc_mentions_global_settings_path(
        self, bootstrap_doc: str
    ) -> None:
        assert "~/.claude/settings.json" in bootstrap_doc or (
            "~/.claude" in bootstrap_doc and "settings.json" in bootstrap_doc
        ), (
            "bootstrap-architecture.md must document the global settings "
            "file path the hook is registered in."
        )

    def test_bootstrap_doc_links_issue(self, bootstrap_doc: str) -> None:
        """Doc should reference #1380 so history is discoverable."""
        assert "1380" in bootstrap_doc, (
            "bootstrap-architecture.md should reference issue #1380 for "
            "historical context."
        )
