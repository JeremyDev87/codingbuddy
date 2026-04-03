"""Centralized plugin data directory resolver.

All plugin modules should use resolve_data_dir() instead of hardcoding ~/.codingbuddy.
Respects CLAUDE_PLUGIN_DATA environment variable.
"""
import os

DEFAULT_DATA_DIR = os.path.join(os.path.expanduser("~"), ".codingbuddy")


def resolve_data_dir() -> str:
    """Resolve plugin data directory.

    Resolution: CLAUDE_PLUGIN_DATA env -> ~/.codingbuddy (default).
    """
    return os.environ.get("CLAUDE_PLUGIN_DATA", DEFAULT_DATA_DIR)
