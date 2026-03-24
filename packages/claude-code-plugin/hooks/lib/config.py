"""Config loader for CodingBuddy plugin hooks.

Finds codingbuddy.config.json by walking up from cwd.
Uses mtime-based caching to avoid re-reading unchanged files.
"""
import json
import os
from typing import Dict, Any, Optional

DEFAULT_CONFIG: Dict[str, Any] = {
    "language": "en",
    "qualityGates": {
        "enabled": False,
    },
}

CONFIG_FILENAME = "codingbuddy.config.json"

# Cache: path -> (mtime, config_dict)
_config_cache: Dict[str, tuple] = {}


def _find_config_file(cwd: str) -> Optional[str]:
    """Walk up from cwd to find codingbuddy.config.json.

    Returns the absolute path to the config file, or None if not found.
    Stops at filesystem root to avoid infinite loops.
    """
    current = os.path.abspath(cwd)
    while True:
        candidate = os.path.join(current, CONFIG_FILENAME)
        if os.path.isfile(candidate):
            return candidate
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def load_config(cwd: str) -> Dict[str, Any]:
    """Find and load codingbuddy.config.json from cwd or parent directories.

    Args:
        cwd: Directory to start searching from.

    Returns:
        Parsed config dict, or DEFAULT_CONFIG if not found / invalid.
    """
    config_path = _find_config_file(cwd)
    if config_path is None:
        return dict(DEFAULT_CONFIG)

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return dict(DEFAULT_CONFIG)


def get_config(cwd: str) -> Dict[str, Any]:
    """Load config with mtime-based caching.

    Only re-reads the file when its modification time changes.

    Args:
        cwd: Directory to start searching from.

    Returns:
        Parsed config dict, or DEFAULT_CONFIG if not found / invalid.
    """
    config_path = _find_config_file(cwd)
    if config_path is None:
        # File removed or never existed — evict cache for this cwd
        _config_cache.pop(cwd, None)
        return dict(DEFAULT_CONFIG)

    try:
        mtime = os.path.getmtime(config_path)
    except OSError:
        _config_cache.pop(cwd, None)
        return dict(DEFAULT_CONFIG)

    cached = _config_cache.get(cwd)
    if cached is not None:
        cached_mtime, cached_config = cached
        if cached_mtime == mtime:
            return cached_config

    config = load_config(cwd)
    _config_cache[cwd] = (mtime, config)
    return config
