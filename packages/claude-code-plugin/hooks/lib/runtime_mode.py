"""Runtime mode detection — MCP vs standalone.

Checks multiple locations for codingbuddy MCP server entry:
1. ~/.claude/mcp.json (global MCP config)
2. ~/.claude/settings.json → mcpServers (global settings)
3. {project_dir}/.mcp.json (project-level config)

Used by prompt_injection, user-prompt-submit, and health_check.
"""
import json
import os
from typing import Optional


def _check_mcp_json(path: str) -> bool:
    """Check if file has mcpServers with a codingbuddy entry."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        mcp_servers = data.get("mcpServers", {})
        return any("codingbuddy" in key.lower() for key in mcp_servers)
    except (OSError, json.JSONDecodeError, TypeError):
        return False


def _check_settings_json(path: str) -> bool:
    """Check settings.json mcpServers for a codingbuddy entry."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        mcp_servers = data.get("mcpServers", {})
        return any("codingbuddy" in key.lower() for key in mcp_servers)
    except (OSError, json.JSONDecodeError, TypeError):
        return False


def detect_runtime_mode(
    home_dir: Optional[str] = None,
    project_dir: Optional[str] = None,
) -> str:
    """Detect if CodingBuddy MCP server is configured.

    Checks three locations in order and returns 'mcp' on first match:
    1. ~/.claude/mcp.json (global MCP config)
    2. ~/.claude/settings.json → mcpServers (global settings)
    3. {project_dir}/.mcp.json (project-level config)

    Args:
        home_dir: Override home directory (for testing).
        project_dir: Project directory to check for .mcp.json.

    Returns:
        'mcp' if codingbuddy MCP server found, 'standalone' otherwise.
    """
    home = home_dir or os.path.expanduser("~")

    # 1. ~/.claude/mcp.json (global MCP config)
    if _check_mcp_json(os.path.join(home, ".claude", "mcp.json")):
        return "mcp"

    # 2. ~/.claude/settings.json → mcpServers
    if _check_settings_json(os.path.join(home, ".claude", "settings.json")):
        return "mcp"

    # 3. {project_dir}/.mcp.json (project-level)
    if project_dir:
        if _check_mcp_json(os.path.join(project_dir, ".mcp.json")):
            return "mcp"

    return "standalone"


def is_mcp_available(
    home_dir: Optional[str] = None,
    project_dir: Optional[str] = None,
) -> bool:
    """Convenience wrapper: True if MCP mode detected."""
    return detect_runtime_mode(home_dir, project_dir) == "mcp"
