"""Sister-bug regression gate for _install_hook_with_lib (#1490).

The UserPromptSubmit hook installer (_install_hook_with_lib) had the
same class of bug as _install_statusline: it used
``shutil.copytree(dirs_exist_ok=True)`` for the lib/ sync, which writes
new files but never removes files that existed before but are gone
now. A renamed module (e.g. ``mode_engine.py`` → ``mode_engine_v2.py``)
would leave the old file in ``~/.claude/hooks/lib/`` indefinitely,
where Python's import system could pick it up first.

v5.6.2 routes both installers through ``_atomic_sync_with_lib`` which
performs an atomic ``rmtree + copytree`` on the lib directory. This
test suite is the regression gate ensuring stale modules are purged
and the hook script rename (``user-prompt-submit.py`` →
``codingbuddy-mode-detect.py``) still works.
"""
import os
import sys
import importlib.util as importutil
from pathlib import Path

import pytest

# Bootstrap session-start.py import (hyphenated filename).
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

_spec = importutil.spec_from_file_location(
    "session_start", os.path.join(_hooks_dir, "session-start.py")
)
session_start = importutil.module_from_spec(_spec)
_spec.loader.exec_module(session_start)


@pytest.fixture
def fake_hook_source(tmp_path):
    """Synthetic UserPromptSubmit source: hooks/user-prompt-submit.py + hooks/lib/."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    src = hooks / "user-prompt-submit.py"
    src.write_text("#!/usr/bin/env python3\nprint('mode-detect stub')")
    lib = hooks / "lib"
    lib.mkdir()
    # Mirror a few real lib modules used by user-prompt-submit.py
    for name in [
        "mode_engine.py",
        "runtime_mode.py",
        "tiny_actor_presets.py",
        "council_animator.py",
        "agent_memory.py",
        "achievement_tracker.py",
    ]:
        (lib / name).write_text(f"# {name} stub")
    return src


class TestInstallHookWithLibStaleSafe:
    """Regression gate for #1490 sister-bug in _install_hook_with_lib."""

    def test_replaces_stale_lib_modules(self, tmp_path, fake_hook_source):
        """Pre-existing renamed modules from prior versions must be purged."""
        hooks_dir = tmp_path / "target_hooks"
        # Pre-populate with a stale module that no longer exists in source
        stale_lib = hooks_dir / "lib"
        stale_lib.mkdir(parents=True)
        (stale_lib / "renamed_in_v5_5.py").write_text("# stale rename leftover")

        target = hooks_dir / "codingbuddy-mode-detect.py"
        session_start._install_hook_with_lib(fake_hook_source, hooks_dir, target)

        assert not (stale_lib / "renamed_in_v5_5.py").exists(), (
            "stale module from prior version must be purged"
        )
        assert (stale_lib / "mode_engine.py").exists()
        assert (stale_lib / "runtime_mode.py").exists()
        assert (stale_lib / "tiny_actor_presets.py").exists()

    def test_excludes_pycache_pyc_pytest_cache_and_test_files(
        self, tmp_path, fake_hook_source
    ):
        """Source pollutants must not pollute the runtime lib dir."""
        # Add pollutants to source lib
        src_lib = fake_hook_source.parent / "lib"
        pycache = src_lib / "__pycache__"
        pycache.mkdir()
        (pycache / "x.cpython-39.pyc").write_text("compiled")
        (src_lib / "stale.pyc").write_text("compiled")
        pcache = src_lib / ".pytest_cache"
        pcache.mkdir()
        (pcache / "v").write_text("cache")
        (src_lib / "test_mode_engine.py").write_text("def test_x(): pass")

        hooks_dir = tmp_path / "target_hooks"
        target = hooks_dir / "codingbuddy-mode-detect.py"
        session_start._install_hook_with_lib(fake_hook_source, hooks_dir, target)

        target_lib = hooks_dir / "lib"
        assert (target_lib / "mode_engine.py").is_file()  # real module copied
        assert not (target_lib / "__pycache__").exists()
        assert not (target_lib / ".pytest_cache").exists()
        assert not list(target_lib.glob("*.pyc"))
        assert not list(target_lib.glob("test_*.py"))

    def test_renames_source_to_target_filename(
        self, tmp_path, fake_hook_source
    ):
        """``user-prompt-submit.py`` source must land at HOOK_FILENAME target.

        The hook is renamed at install time so settings.json points at
        the canonical ``codingbuddy-mode-detect.py`` regardless of the
        plugin's source filename.
        """
        hooks_dir = tmp_path / "target_hooks"
        target = hooks_dir / "codingbuddy-mode-detect.py"
        session_start._install_hook_with_lib(fake_hook_source, hooks_dir, target)

        assert target.exists(), "rename target must exist"
        assert (target.stat().st_mode & 0o777) == 0o755
        assert not (hooks_dir / "user-prompt-submit.py").exists(), (
            "source filename must NOT linger after rename"
        )

    def test_idempotent_double_invocation(self, tmp_path, fake_hook_source):
        """Two consecutive installs leave the same target state."""
        hooks_dir = tmp_path / "target_hooks"
        target = hooks_dir / "codingbuddy-mode-detect.py"

        session_start._install_hook_with_lib(fake_hook_source, hooks_dir, target)
        first = sorted(p.name for p in (hooks_dir / "lib").iterdir())
        first_target_exists = target.exists()
        first_source_lingers = (hooks_dir / "user-prompt-submit.py").exists()

        session_start._install_hook_with_lib(fake_hook_source, hooks_dir, target)
        second = sorted(p.name for p in (hooks_dir / "lib").iterdir())

        assert first == second
        assert first_target_exists is True
        assert first_source_lingers is False
        assert target.exists()
        assert not (hooks_dir / "user-prompt-submit.py").exists()
