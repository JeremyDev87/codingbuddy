"""Mock Claude Code CLI for E2E hook testing.

Simulates the Claude Code hook protocol:
- Feeds JSON input via stdin to hook scripts
- Captures stdout/stderr output
- Validates JSON responses match expected hook contract
"""
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


# Resolve hooks directory relative to this project
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOOKS_DIR = _PROJECT_ROOT / "packages" / "claude-code-plugin" / "hooks"


@dataclass
class HookResult:
    """Result of executing a hook script."""

    exit_code: int
    stdout: str
    stderr: str
    json_output: Optional[Dict[str, Any]] = None

    @property
    def succeeded(self) -> bool:
        """Hook must always exit 0 (never block Claude Code)."""
        return self.exit_code == 0

    @property
    def has_json(self) -> bool:
        return self.json_output is not None

    @property
    def additional_context(self) -> Optional[str]:
        """Extract additionalContext from hookSpecificOutput."""
        if not self.json_output:
            return None
        hso = self.json_output.get("hookSpecificOutput", {})
        return hso.get("additionalContext")

    @property
    def status_message(self) -> Optional[str]:
        """Extract statusMessage from hookSpecificOutput."""
        if not self.json_output:
            return None
        hso = self.json_output.get("hookSpecificOutput", {})
        return hso.get("statusMessage")

    @property
    def system_message(self) -> Optional[str]:
        """Extract systemMessage from top-level output."""
        if not self.json_output:
            return None
        return self.json_output.get("systemMessage")


@dataclass
class MockEnvironment:
    """Isolated environment for hook execution."""

    home_dir: str
    project_dir: str
    env_vars: Dict[str, str] = field(default_factory=dict)

    def build_env(self) -> Dict[str, str]:
        """Build environment variables for hook subprocess."""
        env = os.environ.copy()
        env["HOME"] = self.home_dir
        env["CLAUDE_PROJECT_DIR"] = self.project_dir
        env["CLAUDE_CWD"] = self.project_dir
        env["CLAUDE_PLUGIN_DIR"] = str(HOOKS_DIR.parent)
        env["CLAUDE_PLUGIN_ROOT"] = str(HOOKS_DIR.parent)
        # Isolate plugin data to temp dir
        env["CLAUDE_PLUGIN_DATA"] = os.path.join(self.home_dir, ".codingbuddy")
        # Prevent actual system language detection from interfering
        env["LANG"] = "en_US.UTF-8"
        env.update(self.env_vars)
        return env


def run_hook(
    hook_script: str,
    input_data: Optional[Dict[str, Any]] = None,
    env: Optional[MockEnvironment] = None,
    timeout: int = 15,
) -> HookResult:
    """Execute a hook script with simulated Claude Code protocol.

    Args:
        hook_script: Filename of the hook in the hooks directory (e.g. "session-start.py").
        input_data: JSON-serializable dict to feed via stdin.
        env: Mock environment for isolation. Uses real env if None.
        timeout: Max seconds before killing the process.

    Returns:
        HookResult with captured output.
    """
    script_path = HOOKS_DIR / hook_script
    if not script_path.exists():
        raise FileNotFoundError(f"Hook script not found: {script_path}")

    stdin_bytes = json.dumps(input_data).encode() if input_data else b""

    proc_env = env.build_env() if env else os.environ.copy()

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            input=stdin_bytes,
            capture_output=True,
            timeout=timeout,
            env=proc_env,
            cwd=env.project_dir if env else None,
        )
    except subprocess.TimeoutExpired:
        return HookResult(exit_code=1, stdout="", stderr="TIMEOUT")

    stdout_text = result.stdout.decode("utf-8", errors="replace")
    stderr_text = result.stderr.decode("utf-8", errors="replace")

    # Try to parse stdout as JSON (hooks that use safe_main output JSON)
    json_output = None
    stdout_stripped = stdout_text.strip()
    if stdout_stripped:
        # Some hooks output plain text before JSON; try to find JSON at the end
        for candidate in [stdout_stripped, stdout_stripped.split("\n")[-1]]:
            try:
                json_output = json.loads(candidate)
                break
            except (json.JSONDecodeError, IndexError):
                continue

    return HookResult(
        exit_code=result.returncode,
        stdout=stdout_text,
        stderr=stderr_text,
        json_output=json_output,
    )


@dataclass
class LifecycleRunner:
    """Simulates a full Claude Code session hook lifecycle.

    Runs hooks in order: SessionStart → PreToolUse → PostToolUse → Stop
    """

    env: MockEnvironment
    results: List[HookResult] = field(default_factory=list)

    def session_start(self) -> HookResult:
        """Execute SessionStart hook."""
        result = run_hook("session-start.py", env=self.env)
        self.results.append(result)
        return result

    def user_prompt_submit(self, prompt: str) -> HookResult:
        """Execute UserPromptSubmit hook with a user prompt."""
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": prompt},
            env=self.env,
        )
        self.results.append(result)
        return result

    def pre_tool_use(
        self,
        tool_name: str,
        tool_input: Optional[Dict[str, Any]] = None,
    ) -> HookResult:
        """Execute PreToolUse hook."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": tool_name,
                "tool_input": tool_input or {},
            },
            env=self.env,
        )
        self.results.append(result)
        return result

    def post_tool_use(
        self,
        tool_name: str,
        tool_input: Optional[Dict[str, Any]] = None,
        tool_output: str = "",
    ) -> HookResult:
        """Execute PostToolUse hook."""
        result = run_hook(
            "post-tool-use.py",
            input_data={
                "tool_name": tool_name,
                "tool_input": tool_input or {},
                "tool_output": tool_output,
            },
            env=self.env,
        )
        self.results.append(result)
        return result

    def stop(self) -> HookResult:
        """Execute Stop hook."""
        result = run_hook("stop.py", input_data={}, env=self.env)
        self.results.append(result)
        return result

    @property
    def all_succeeded(self) -> bool:
        """Check all hooks exited with code 0."""
        return all(r.succeeded for r in self.results)
