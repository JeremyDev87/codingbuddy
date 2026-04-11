"""Tests for _atomic_sync_with_lib helper (#1490).

This helper is the canonical install primitive for both:
  - _install_statusline (HUD)
  - _install_hook_with_lib (UserPromptSubmit hook)

Why this helper exists
----------------------
Prior to v5.6.2, _install_statusline only copied the script file
(not its sibling lib/ directory), and _install_hook_with_lib used
copytree(dirs_exist_ok=True) which left renamed/removed modules
from prior plugin versions stranded. Both bugs caused statusLine
to render only the fallback face once Wave 1/2/3 modules were
extracted to lib/ in v5.6.0.

This helper guarantees:
  1. Script is copied and made executable.
  2. lib/ is atomically replaced (rmtree + copytree) so stale
     modules cannot linger.
  3. Pyc, pycache, pytest cache, and test_*.py files are excluded
     so the runtime sys.path stays clean.
"""
import os
import sys
import shutil
import importlib.util as importutil
from pathlib import Path

import pytest

# Bootstrap session-start.py import (hyphenated filename)
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


# ----- fixtures -----


@pytest.fixture
def fake_source_with_lib(tmp_path):
    """Create a synthetic source layout: hooks/script.py + hooks/lib/*.py."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    script = hooks / "script.py"
    script.write_text("# fake script")
    lib = hooks / "lib"
    lib.mkdir()
    (lib / "mod_a.py").write_text("VAL_A = 1")
    (lib / "mod_b.py").write_text("VAL_B = 2")
    (lib / "shared_helper.py").write_text("# helper")
    return script


@pytest.fixture
def fake_source_with_lib_and_caches(tmp_path):
    """Same as above but with __pycache__, .pytest_cache, *.pyc, test_*.py."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    script = hooks / "script.py"
    script.write_text("# fake script")
    lib = hooks / "lib"
    lib.mkdir()
    (lib / "mod_a.py").write_text("VAL_A = 1")

    # Pollutants that must NOT be copied
    pycache = lib / "__pycache__"
    pycache.mkdir()
    (pycache / "mod_a.cpython-39.pyc").write_text("compiled")
    (lib / "mod_a.pyc").write_text("compiled")
    pytest_cache = lib / ".pytest_cache"
    pytest_cache.mkdir()
    (pytest_cache / "v").write_text("cache")
    (lib / "test_mod_a.py").write_text("def test_x(): pass")

    return script


@pytest.fixture
def fake_source_no_lib(tmp_path):
    """Source script without a sibling lib/ directory."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    script = hooks / "script.py"
    script.write_text("# standalone")
    return script


@pytest.fixture
def target_dir(tmp_path):
    """Empty target directory."""
    return tmp_path / "target"


# ----- tests -----


class TestAtomicSyncWithLib:
    """RED tests for the new helper. All must fail before GREEN."""

    def test_helper_exists(self):
        """The helper must be exposed on the session_start module."""
        assert hasattr(session_start, "_atomic_sync_with_lib"), (
            "session-start.py must export _atomic_sync_with_lib"
        )

    def test_creates_target_dir_and_copies_script(
        self, fake_source_with_lib, target_dir
    ):
        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        assert (target_dir / "script.py").is_file()

    def test_target_script_is_executable(self, fake_source_with_lib, target_dir):
        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        target = target_dir / "script.py"
        assert os.access(str(target), os.X_OK), "script must be 0755"

    def test_copies_lib_directory(self, fake_source_with_lib, target_dir):
        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        target_lib = target_dir / "lib"
        assert target_lib.is_dir()
        assert (target_lib / "mod_a.py").is_file()
        assert (target_lib / "mod_b.py").is_file()
        assert (target_lib / "shared_helper.py").is_file()

    def test_no_lib_in_source_silently_skips_lib(
        self, fake_source_no_lib, target_dir
    ):
        """Helper must not crash when source has no sibling lib/."""
        session_start._atomic_sync_with_lib(fake_source_no_lib, target_dir)
        assert (target_dir / "script.py").is_file()
        assert not (target_dir / "lib").exists()

    def test_excludes_pycache_pyc_pytest_cache_and_test_files(
        self, fake_source_with_lib_and_caches, target_dir
    ):
        session_start._atomic_sync_with_lib(
            fake_source_with_lib_and_caches, target_dir
        )
        target_lib = target_dir / "lib"
        # Real module copied
        assert (target_lib / "mod_a.py").is_file()
        # Pollutants NOT copied
        assert not (target_lib / "__pycache__").exists()
        assert not (target_lib / ".pytest_cache").exists()
        assert not list(target_lib.glob("*.pyc"))
        assert not list(target_lib.glob("test_*.py"))

    def test_replaces_stale_lib_modules(
        self, fake_source_with_lib, target_dir
    ):
        """Modules present in target lib but absent in source must be removed."""
        target_lib = target_dir / "lib"
        target_lib.mkdir(parents=True)
        (target_lib / "obsolete_renamed.py").write_text("# stale from prior version")
        (target_lib / "mod_a.py").write_text("OLD_VAL = 0")  # outdated content

        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)

        # Stale module gone
        assert not (target_lib / "obsolete_renamed.py").exists()
        # Real module replaced with current content
        assert (target_lib / "mod_a.py").read_text() == "VAL_A = 1"

    def test_idempotent_double_invocation(
        self, fake_source_with_lib, target_dir
    ):
        """Two consecutive invocations leave the same target state."""
        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        first_lib = sorted(p.name for p in (target_dir / "lib").iterdir())
        first_script = (target_dir / "script.py").read_text()

        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        second_lib = sorted(p.name for p in (target_dir / "lib").iterdir())
        second_script = (target_dir / "script.py").read_text()

        assert first_lib == second_lib
        assert first_script == second_script

    def test_extra_ignore_argument_is_honored(
        self, fake_source_with_lib, target_dir
    ):
        """Caller can pass extra ignore patterns."""
        session_start._atomic_sync_with_lib(
            fake_source_with_lib,
            target_dir,
            extra_ignore=("shared_helper.py",),
        )
        target_lib = target_dir / "lib"
        assert (target_lib / "mod_a.py").is_file()
        assert not (target_lib / "shared_helper.py").exists()

    def test_no_staging_leftovers_after_success(
        self, fake_source_with_lib, target_dir
    ):
        """Staging/archive directories must be cleaned up on success.

        Regression gate for the v5.6.2 atomic-swap refactor: after a
        successful sync, the parent directory must NOT contain any
        stray ``.lib.staging-*`` or ``.lib.old-*`` entries, or the
        next session-start would race on them.
        """
        session_start._atomic_sync_with_lib(fake_source_with_lib, target_dir)
        leftover_staging = list(target_dir.glob(".lib.staging-*"))
        leftover_old = list(target_dir.glob(".lib.old-*"))
        assert leftover_staging == [], (
            f"staging directories leaked: {leftover_staging}"
        )
        assert leftover_old == [], (
            f"archive directories leaked: {leftover_old}"
        )
        assert (target_dir / "lib" / "mod_a.py").is_file()

    def test_rollback_preserves_old_lib_when_copytree_fails(
        self, tmp_path, monkeypatch
    ):
        """If copytree fails mid-sync, the existing lib must survive.

        Simulates a source lib whose copytree raises partway through
        and asserts that the pre-existing target_lib is NOT lost.
        Protects users from losing a working HUD install if a future
        plugin ships a broken source tree or the disk fills up.
        """
        src_hooks = tmp_path / "src_hooks"
        src_hooks.mkdir()
        (src_hooks / "script.py").write_text("# src")
        src_lib = src_hooks / "lib"
        src_lib.mkdir()
        (src_lib / "mod_a.py").write_text("VAL_A = 1")

        target = tmp_path / "target"
        target.mkdir()
        target_lib = target / "lib"
        target_lib.mkdir()
        (target_lib / "prior_mod.py").write_text("# survivor")

        real_copytree = shutil.copytree

        def flaky_copytree(*args, **kwargs):
            raise OSError("simulated disk full")

        monkeypatch.setattr(session_start.shutil, "copytree", flaky_copytree)

        with pytest.raises(OSError, match="simulated disk full"):
            session_start._atomic_sync_with_lib(
                src_hooks / "script.py", target
            )

        # Old lib must survive
        assert target_lib.exists()
        assert (target_lib / "prior_mod.py").read_text() == "# survivor"
        # No leaked staging or archive dirs
        assert list(target.glob(".lib.staging-*")) == []
        assert list(target.glob(".lib.old-*")) == []
