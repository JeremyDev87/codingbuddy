"""Tests for hooks/lib/health_check.py — plugin health check diagnostics."""
import json
import os
import sqlite3
import stat
import tempfile

import pytest

from hooks.lib.health_check import HealthChecker


HOOK_FILES = [
    "session-start.py",
    "pre-tool-use.py",
    "post-tool-use.py",
    "stop.py",
    "user-prompt-submit.py",
]


@pytest.fixture
def env(tmp_path):
    """Create a complete healthy plugin environment for testing."""
    hooks_dir = tmp_path / "hooks"
    hooks_dir.mkdir()

    # hooks.json
    hooks_json = {
        "hooks": {
            "SessionStart": [{"hooks": [{"type": "command"}]}],
        }
    }
    (hooks_dir / "hooks.json").write_text(json.dumps(hooks_json))

    # hook files
    for name in HOOK_FILES:
        (hooks_dir / name).write_text("# hook")

    # history.db with correct tables
    data_dir = tmp_path / ".codingbuddy"
    data_dir.mkdir()
    db_path = data_dir / "history.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE sessions (id INTEGER PRIMARY KEY, session_id TEXT);
        CREATE TABLE tool_calls (id INTEGER PRIMARY KEY, session_id TEXT);
    """)
    conn.close()

    # ~/.claude/settings.json with UserPromptSubmit hook
    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()
    settings = {
        "hooks": {
            "UserPromptSubmit": [
                {"hooks": [{"type": "command", "command": "python3 user-prompt-submit.py"}]}
            ]
        }
    }
    (claude_dir / "settings.json").write_text(json.dumps(settings))

    # codingbuddy.config.json
    (tmp_path / "codingbuddy.config.json").write_text(json.dumps({"language": "ko"}))

    # secrets.json with correct permissions
    secrets_path = data_dir / "secrets.json"
    secrets_path.write_text(json.dumps({"token": "abc"}))
    os.chmod(str(secrets_path), 0o600)

    # events directory
    events_dir = data_dir / "events"
    events_dir.mkdir()

    return tmp_path


def _make_checker(env_path):
    """Create HealthChecker with all paths pointing to tmp_path."""
    return HealthChecker(
        plugin_root=str(env_path),
        home_dir=str(env_path),
        project_dir=str(env_path),
    )


class TestCheckHooksJson:
    """Check 1: hooks.json existence and validity."""

    def test_valid_hooks_json(self, env):
        checker = _make_checker(env)
        result = checker.check_hooks_json()
        assert result["status"] == "PASS"
        assert result["check"] == "hooks_json"

    def test_missing_hooks_json(self, env):
        (env / "hooks" / "hooks.json").unlink()
        checker = _make_checker(env)
        result = checker.check_hooks_json()
        assert result["status"] == "WARN"

    def test_invalid_hooks_json(self, env):
        (env / "hooks" / "hooks.json").write_text("not valid json{{{")
        checker = _make_checker(env)
        result = checker.check_hooks_json()
        assert result["status"] == "FAIL"


class TestCheckHookFiles:
    """Check 2: hook script files existence."""

    def test_all_hook_files_exist(self, env):
        checker = _make_checker(env)
        result = checker.check_hook_files()
        assert result["status"] == "PASS"

    def test_some_hook_files_missing(self, env):
        (env / "hooks" / "stop.py").unlink()
        (env / "hooks" / "pre-tool-use.py").unlink()
        checker = _make_checker(env)
        result = checker.check_hook_files()
        assert result["status"] == "WARN"
        assert "stop.py" in result["message"]
        assert "pre-tool-use.py" in result["message"]


class TestCheckHistoryDb:
    """Check 3: history.db access and schema."""

    def test_valid_db(self, env):
        checker = _make_checker(env)
        result = checker.check_history_db()
        assert result["status"] == "PASS"

    def test_missing_db(self, env):
        (env / ".codingbuddy" / "history.db").unlink()
        checker = _make_checker(env)
        result = checker.check_history_db()
        assert result["status"] == "WARN"

    def test_missing_tables(self, env):
        db_path = env / ".codingbuddy" / "history.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("DROP TABLE tool_calls")
        conn.close()
        checker = _make_checker(env)
        result = checker.check_history_db()
        assert result["status"] == "FAIL"
        assert "tool_calls" in result["message"]


class TestCheckSettingsHook:
    """Check 4: UserPromptSubmit hook in settings.json."""

    def test_hook_registered(self, env):
        checker = _make_checker(env)
        result = checker.check_settings_hook()
        assert result["status"] == "PASS"

    def test_hook_not_registered(self, env):
        settings_path = env / ".claude" / "settings.json"
        settings_path.write_text(json.dumps({"hooks": {}}))
        checker = _make_checker(env)
        result = checker.check_settings_hook()
        assert result["status"] == "WARN"

    def test_settings_missing(self, env):
        (env / ".claude" / "settings.json").unlink()
        checker = _make_checker(env)
        result = checker.check_settings_hook()
        assert result["status"] == "WARN"


class TestCheckConfig:
    """Check 5: codingbuddy.config.json parseable."""

    def test_valid_config(self, env):
        checker = _make_checker(env)
        result = checker.check_config()
        assert result["status"] == "PASS"

    def test_missing_config(self, env):
        (env / "codingbuddy.config.json").unlink()
        checker = _make_checker(env)
        result = checker.check_config()
        assert result["status"] == "WARN"


class TestCheckSecretsPermissions:
    """Check 6: secrets.json file permissions."""

    def test_correct_permissions(self, env):
        checker = _make_checker(env)
        result = checker.check_secrets_permissions()
        assert result["status"] == "PASS"

    def test_wrong_permissions(self, env):
        secrets_path = env / ".codingbuddy" / "secrets.json"
        os.chmod(str(secrets_path), 0o644)
        checker = _make_checker(env)
        result = checker.check_secrets_permissions()
        assert result["status"] == "WARN"

    def test_secrets_not_exists(self, env):
        (env / ".codingbuddy" / "secrets.json").unlink()
        checker = _make_checker(env)
        result = checker.check_secrets_permissions()
        assert result["status"] == "PASS"
        assert "not found" in result["message"].lower() or "skip" in result["message"].lower()


class TestCheckEventsDir:
    """Check 7: events directory existence."""

    def test_events_dir_exists(self, env):
        checker = _make_checker(env)
        result = checker.check_events_dir()
        assert result["status"] == "PASS"

    def test_events_dir_missing(self, env):
        (env / ".codingbuddy" / "events").rmdir()
        checker = _make_checker(env)
        result = checker.check_events_dir()
        assert result["status"] == "WARN"


class TestRunAll:
    """run_all() returns all 7 check results."""

    def test_returns_7_results(self, env):
        checker = _make_checker(env)
        results = checker.run_all()
        assert len(results) == 7
        assert all(r["status"] == "PASS" for r in results)

    def test_each_check_has_required_keys(self, env):
        checker = _make_checker(env)
        results = checker.run_all()
        for r in results:
            assert "check" in r
            assert "status" in r
            assert "message" in r
            assert r["status"] in ("PASS", "WARN", "FAIL")


class TestFormatReport:
    """format_report() produces human-readable output."""

    def test_format_report_contains_all_checks(self, env):
        checker = _make_checker(env)
        results = checker.run_all()
        report = checker.format_report(results)
        assert isinstance(report, str)
        assert "PASS" in report
        assert len(report) > 50

    def test_format_report_shows_failures(self, env):
        (env / "hooks" / "hooks.json").write_text("bad json")
        checker = _make_checker(env)
        results = checker.run_all()
        report = checker.format_report(results)
        assert "FAIL" in report
