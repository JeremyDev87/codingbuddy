"""Crash-safe decorator for CodingBuddy hook entry points.

Wraps hook functions to:
- Read JSON from stdin and pass parsed data to the handler
- Write handler return value as JSON to stdout
- ALWAYS sys.exit(0) — never block Claude Code, even on errors
"""
import json
import os
import sys
from functools import wraps

# Ensure hooks/lib is on sys.path
_hooks_lib_dir = os.path.dirname(os.path.abspath(__file__))
if _hooks_lib_dir not in sys.path:
    sys.path.insert(0, _hooks_lib_dir)


def safe_main(fn):
    """Decorator that makes a hook entry point crash-safe.

    Usage::

        @safe_main
        def handle(data: dict) -> dict | None:
            # data is parsed JSON from stdin
            return {"decision": "approve"}  # or None for no output

        if __name__ == "__main__":
            handle()
    """

    @wraps(fn)
    def wrapper():
        try:
            raw = sys.stdin.read()
            data = json.loads(raw) if raw.strip() else {}
            result = fn(data)
            if result is not None:
                json.dump(result, sys.stdout)
        except Exception:
            pass
        finally:
            sys.exit(0)

    return wrapper
