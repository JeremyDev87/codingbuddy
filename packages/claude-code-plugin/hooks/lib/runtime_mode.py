"""Runtime mode detection — MCP vs standalone.

Checks ~/.claude/mcp.json for codingbuddy MCP server entry.
Used by prompt_injection, user-prompt-submit, and health_check.
"""
import json
import os
from typing import Optional


def detect_runtime_mode(home_dir: Optional[str] = None) -> str:
    """Detect if CodingBuddy MCP server is configured.

    Checks ~/.claude/mcp.json for an entry containing 'codingbuddy'.

    Args:
        home_dir: Override home directory (for testing).

    Returns:
        'mcp' if codingbuddy MCP server found, 'standalone' otherwise.
    """
    home = home_dir or os.path.expanduser("~")
    mcp_json_path = os.path.join(home, ".claude", "mcp.json")

    try:
        with open(mcp_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        mcp_servers = data.get("mcpServers", {})
        for key in mcp_servers:
            if "codingbuddy" in key.lower():
                return "mcp"
        return "standalone"
    except (OSError, json.JSONDecodeError, TypeError):
        return "standalone"


def is_mcp_available(home_dir: Optional[str] = None) -> bool:
    """Convenience wrapper: True if MCP mode detected."""
    return detect_runtime_mode(home_dir) == "mcp"
