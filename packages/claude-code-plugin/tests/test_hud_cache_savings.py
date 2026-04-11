"""Skeleton sanity for hud_cache_savings — Wave 2-C placeholder (#1463)."""
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)


def test_module_loads():
    """Contract: hud_cache_savings must be importable. Wave 2-C will add real assertions."""
    import hud_cache_savings  # noqa: F401
