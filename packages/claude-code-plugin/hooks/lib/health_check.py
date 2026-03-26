"""Plugin health check diagnostic module.

Diagnoses plugin installation state, DB integrity, hook registration,
and config file consistency in a single pass.
"""
import json
import os
import sqlite3
import stat
from typing import Dict, List, Optional

HOOK_FILES = [
    "session-start.py",
    "pre-tool-use.py",
    "post-tool-use.py",
    "stop.py",
    "user-prompt-submit.py",
]

REQUIRED_TABLES = ["sessions", "tool_calls"]


def _result(check: str, status: str, message: str) -> Dict[str, str]:
    """Build a single check result dict."""
    return {"check": check, "status": status, "message": message}


class HealthChecker:
    """Runs 7 diagnostic checks on the CodingBuddy plugin environment."""

    def __init__(
        self,
        plugin_root: str,
        home_dir: Optional[str] = None,
        project_dir: Optional[str] = None,
    ):
        self._plugin_root = plugin_root
        self._home_dir = home_dir or os.path.expanduser("~")
        self._project_dir = project_dir or plugin_root
        self._hooks_dir = os.path.join(plugin_root, "hooks")
        self._data_dir = os.path.join(self._home_dir, ".codingbuddy")
        self._claude_dir = os.path.join(self._home_dir, ".claude")

    # ------------------------------------------------------------------
    # Check 1: hooks.json
    # ------------------------------------------------------------------
    def check_hooks_json(self) -> Dict[str, str]:
        path = os.path.join(self._hooks_dir, "hooks.json")
        if not os.path.isfile(path):
            return _result("hooks_json", "WARN", "hooks.json not found")
        try:
            with open(path, "r", encoding="utf-8") as f:
                json.load(f)
            return _result("hooks_json", "PASS", "hooks.json is valid")
        except json.JSONDecodeError as e:
            return _result("hooks_json", "FAIL", f"hooks.json parse error: {e}")

    # ------------------------------------------------------------------
    # Check 2: hook script files
    # ------------------------------------------------------------------
    def check_hook_files(self) -> Dict[str, str]:
        missing = [
            name
            for name in HOOK_FILES
            if not os.path.isfile(os.path.join(self._hooks_dir, name))
        ]
        if not missing:
            return _result("hook_files", "PASS", "All hook files present")
        return _result(
            "hook_files",
            "WARN",
            f"Missing hook files: {', '.join(missing)}",
        )

    # ------------------------------------------------------------------
    # Check 3: history.db
    # ------------------------------------------------------------------
    def check_history_db(self) -> Dict[str, str]:
        db_path = os.path.join(self._data_dir, "history.db")
        if not os.path.isfile(db_path):
            return _result("history_db", "WARN", "history.db not found")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = {row[0] for row in cursor.fetchall()}
            conn.close()
            missing = [t for t in REQUIRED_TABLES if t not in tables]
            if missing:
                return _result(
                    "history_db",
                    "FAIL",
                    f"Missing tables: {', '.join(missing)}",
                )
            return _result("history_db", "PASS", "history.db schema OK")
        except sqlite3.Error as e:
            return _result("history_db", "FAIL", f"DB error: {e}")

    # ------------------------------------------------------------------
    # Check 4: UserPromptSubmit hook in settings.json
    # ------------------------------------------------------------------
    def check_settings_hook(self) -> Dict[str, str]:
        path = os.path.join(self._claude_dir, "settings.json")
        if not os.path.isfile(path):
            return _result(
                "settings_hook", "WARN", "settings.json not found"
            )
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            hooks = data.get("hooks", {})
            if "UserPromptSubmit" in hooks:
                return _result(
                    "settings_hook", "PASS", "UserPromptSubmit hook registered"
                )
            return _result(
                "settings_hook",
                "WARN",
                "UserPromptSubmit hook not registered in settings.json",
            )
        except (json.JSONDecodeError, OSError) as e:
            return _result("settings_hook", "FAIL", f"settings.json error: {e}")

    # ------------------------------------------------------------------
    # Check 5: codingbuddy.config.json
    # ------------------------------------------------------------------
    def check_config(self) -> Dict[str, str]:
        path = os.path.join(self._project_dir, "codingbuddy.config.json")
        if not os.path.isfile(path):
            return _result("config", "WARN", "codingbuddy.config.json not found")
        try:
            with open(path, "r", encoding="utf-8") as f:
                json.load(f)
            return _result("config", "PASS", "codingbuddy.config.json is valid")
        except json.JSONDecodeError as e:
            return _result("config", "FAIL", f"Config parse error: {e}")

    # ------------------------------------------------------------------
    # Check 6: secrets.json permissions
    # ------------------------------------------------------------------
    def check_secrets_permissions(self) -> Dict[str, str]:
        path = os.path.join(self._data_dir, "secrets.json")
        if not os.path.isfile(path):
            return _result(
                "secrets_permissions", "PASS", "secrets.json not found, skipped"
            )
        file_mode = stat.S_IMODE(os.stat(path).st_mode)
        if file_mode == 0o600:
            return _result(
                "secrets_permissions", "PASS", "secrets.json permissions OK (0600)"
            )
        return _result(
            "secrets_permissions",
            "WARN",
            f"secrets.json has mode {oct(file_mode)}, expected 0o600",
        )

    # ------------------------------------------------------------------
    # Check 7: events directory
    # ------------------------------------------------------------------
    def check_events_dir(self) -> Dict[str, str]:
        path = os.path.join(self._data_dir, "events")
        if os.path.isdir(path):
            return _result("events_dir", "PASS", "events/ directory exists")
        return _result("events_dir", "WARN", "events/ directory not found")

    # ------------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------------
    def run_all(self) -> List[Dict[str, str]]:
        """Run all 7 diagnostic checks and return results."""
        return [
            self.check_hooks_json(),
            self.check_hook_files(),
            self.check_history_db(),
            self.check_settings_hook(),
            self.check_config(),
            self.check_secrets_permissions(),
            self.check_events_dir(),
        ]

    @staticmethod
    def format_report(results: List[Dict[str, str]]) -> str:
        """Format check results as a human-readable report."""
        lines = ["CodingBuddy Plugin Health Check", "=" * 40]
        for r in results:
            icon = {"PASS": "OK", "WARN": "!!", "FAIL": "XX"}[r["status"]]
            lines.append(f"[{icon}] {r['status']:4s} | {r['check']}: {r['message']}")
        total = len(results)
        passed = sum(1 for r in results if r["status"] == "PASS")
        failed = sum(1 for r in results if r["status"] == "FAIL")
        warned = sum(1 for r in results if r["status"] == "WARN")
        lines.append("=" * 40)
        lines.append(f"Total: {total} | PASS: {passed} | WARN: {warned} | FAIL: {failed}")
        return "\n".join(lines)
