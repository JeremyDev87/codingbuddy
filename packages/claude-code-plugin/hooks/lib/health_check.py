"""Plugin health check diagnostic module.

Diagnoses plugin installation state, DB integrity, hook registration,
and config file consistency in a single pass.
"""
import json
import os
import sqlite3
import stat
import sys
from typing import Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_dir import resolve_data_dir
from runtime_mode import detect_runtime_mode

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
    """Runs 10 diagnostic checks on the CodingBuddy plugin environment."""

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
        self._data_dir = (
            os.path.join(self._home_dir, ".codingbuddy") if home_dir else resolve_data_dir()
        )
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
    # Check 8: MCP connection
    # ------------------------------------------------------------------
    def check_mcp_connection(self) -> Dict[str, str]:
        """Check if CodingBuddy MCP server is configured.

        Checks three locations in order:
        1. ~/.claude/mcp.json
        2. ~/.claude/settings.json → mcpServers
        3. {project_dir}/.mcp.json
        """
        locations = [
            os.path.join(self._claude_dir, "mcp.json"),
            os.path.join(self._claude_dir, "settings.json"),
            os.path.join(self._project_dir, ".mcp.json"),
        ]
        for path in locations:
            if not os.path.isfile(path):
                continue
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                servers = data.get("mcpServers", {})
                for key in servers:
                    if "codingbuddy" in key.lower():
                        return _result(
                            "mcp_connection", "PASS",
                            f"MCP configured (codingbuddy entry found in {os.path.basename(path)})",
                        )
            except (json.JSONDecodeError, OSError):
                continue
        return _result("mcp_connection", "WARN", "MCP not configured — standalone mode active")

    # ------------------------------------------------------------------
    # Check 9: runtime mode
    # ------------------------------------------------------------------
    def check_runtime_mode(self) -> Dict[str, str]:
        """Detect current runtime mode (mcp or standalone)."""
        mode = detect_runtime_mode(self._home_dir, self._project_dir)
        return _result("runtime_mode", "PASS", f"Runtime: {mode}")

    # ------------------------------------------------------------------
    # Check 10: standalone readiness
    # ------------------------------------------------------------------
    def check_standalone_readiness(self) -> Dict[str, str]:
        """Check if standalone mode prerequisites are met."""
        issues = []
        has_ai_rules = True
        # Check .ai-rules existence (informational only — ModeEngine has template fallback)
        rules_dir = os.path.join(self._project_dir, ".ai-rules")
        if not os.path.isdir(rules_dir):
            pkg_rules = os.path.join(self._plugin_root, "..", "rules", ".ai-rules")
            if not os.path.isdir(os.path.normpath(pkg_rules)):
                has_ai_rules = False
        # Check ModeEngine importable
        try:
            from mode_engine import ModeEngine  # noqa: F401
        except ImportError:
            issues.append("ModeEngine not importable")
        # Check UserPromptSubmit registered
        settings_result = self.check_settings_hook()
        if settings_result["status"] != "PASS":
            issues.append("UserPromptSubmit hook not registered")

        if not issues:
            if has_ai_rules:
                return _result("standalone_readiness", "PASS", "Standalone mode ready")
            return _result(
                "standalone_readiness",
                "PASS",
                "Standalone mode ready (template fallback, no .ai-rules)",
            )
        return _result("standalone_readiness", "WARN", f"Standalone not ready: {', '.join(issues)}")

    # ------------------------------------------------------------------
    # Check 11: HUD asset installation (#1490 prevention)
    # ------------------------------------------------------------------
    def check_hud_installation(self) -> Dict[str, str]:
        """Verify HUD asset installation integrity.

        Detects the v5.6.0/v5.6.1 failure mode where ``~/.claude/hud/lib``
        is missing or stale and the statusLine renders only the
        fallback ``◕‿◕ CodingBuddy`` face.

        Performs three layers of verification:
          1. Script presence at ``~/.claude/hud/codingbuddy-hud.py``
          2. Lib directory presence + the seven critical modules:
             ``hud_buddy``, ``hud_state``, ``hud_helpers``,
             ``tiny_actor_presets``, ``hud_version``, ``hud_rate_limits``,
             ``hud_layout``
          3. A subprocess render smoke test that catches the case where
             everything looks present but imports still fail at runtime
             (e.g. permission issues, partial copy)
        """
        import subprocess

        hud_dir = os.path.join(self._claude_dir, "hud")
        script = os.path.join(hud_dir, "codingbuddy-hud.py")
        lib = os.path.join(hud_dir, "lib")
        stamp = os.path.join(hud_dir, ".version")

        if not os.path.isfile(script):
            return _result(
                "hud_installation",
                "FAIL",
                "HUD script missing at ~/.claude/hud/codingbuddy-hud.py",
            )

        if not os.path.isdir(lib):
            return _result(
                "hud_installation",
                "FAIL",
                "HUD lib/ directory missing — statusLine renders fallback only",
            )

        required_modules = [
            "hud_buddy.py",
            "hud_state.py",
            "hud_helpers.py",
            "tiny_actor_presets.py",
            "hud_version.py",
            "hud_rate_limits.py",
            "hud_layout.py",
        ]
        missing = [
            m for m in required_modules if not os.path.isfile(os.path.join(lib, m))
        ]
        if missing:
            return _result(
                "hud_installation",
                "FAIL",
                f"HUD lib missing modules: {', '.join(missing)}",
            )

        # Subprocess render smoke — catches runtime import failures
        # AND partially-rendered status lines (e.g. empty version
        # segment when hud_version's 3-tier fallback all fail).
        # HOME is pinned to self._home_dir so the subprocess's
        # tier-1 version lookup (~/.claude/plugins/installed_plugins.json)
        # resolves against the same environment the diagnostic was
        # configured with, rather than leaking the CI runner's real
        # home.
        isolated_env = {
            "HOME": self._home_dir,
            "PATH": os.environ.get("PATH", ""),
            "LANG": os.environ.get("LANG", ""),
            "LC_ALL": os.environ.get("LC_ALL", ""),
        }
        try:
            r = subprocess.run(
                ["python3", script],
                input='{"session_id":"healthcheck","model":{"display_name":"Test"}}',
                capture_output=True,
                text=True,
                timeout=5,
                env=isolated_env,
            )
            rendered = r.stdout.strip()
            if rendered == "◕‿◕ CodingBuddy":
                return _result(
                    "hud_installation",
                    "FAIL",
                    "HUD smoke test produced fallback face — lib import failing at runtime",
                )
            # Version segment must not be empty. ``CB `` without the
            # trailing ``v`` indicates all three version-resolution
            # tiers (installed_plugins.json, plugin.json, hud_state)
            # returned the empty string — a silent half-broken state
            # that would otherwise ship unnoticed.
            if "CB " in rendered and "CB v" not in rendered:
                return _result(
                    "hud_installation",
                    "FAIL",
                    "HUD rendered empty version segment — hud_version fallback chain broken",
                )
        except subprocess.TimeoutExpired:
            return _result(
                "hud_installation",
                "WARN",
                "HUD smoke test timed out (5s)",
            )
        except Exception as e:
            return _result(
                "hud_installation",
                "WARN",
                f"HUD smoke test crashed: {e}",
            )

        version_msg = ""
        if os.path.isfile(stamp):
            try:
                with open(stamp, "r", encoding="utf-8") as f:
                    version_msg = f" (v{f.read().strip()})"
            except OSError:
                pass

        return _result(
            "hud_installation",
            "PASS",
            f"HUD assets installed and rendering full status line{version_msg}",
        )

    # ------------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------------
    def run_all(self) -> List[Dict[str, str]]:
        """Run all 11 diagnostic checks and return results."""
        return [
            self.check_hooks_json(),
            self.check_hook_files(),
            self.check_history_db(),
            self.check_settings_hook(),
            self.check_config(),
            self.check_secrets_permissions(),
            self.check_events_dir(),
            self.check_mcp_connection(),
            self.check_runtime_mode(),
            self.check_standalone_readiness(),
            self.check_hud_installation(),
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
