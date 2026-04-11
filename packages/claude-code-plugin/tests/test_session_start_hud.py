"""Tests for statusLine auto-install in session-start (#1089, #1092, #1490)."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from unittest import mock

import pytest

# Ensure hooks/ is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)

# Also hooks/lib for _read_settings_file, _write_settings_file
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)


# We need to import from session-start.py which has a hyphen in the name
from importlib import import_module
from importlib import util as importutil

_spec = importutil.spec_from_file_location(
    "session_start", os.path.join(_hooks_dir, "session-start.py")
)
session_start = importutil.module_from_spec(_spec)
_spec.loader.exec_module(session_start)


@pytest.fixture
def home_dir(tmp_path):
    """Simulated home directory."""
    (tmp_path / ".claude" / "hooks").mkdir(parents=True)
    return tmp_path


@pytest.fixture
def settings_file(home_dir):
    """Path to settings.json in simulated home."""
    sf = home_dir / ".claude" / "settings.json"
    sf.write_text(json.dumps({"env": {}}))
    return sf


@pytest.fixture
def hud_source(home_dir):
    """Create a fake codingbuddy-hud.py source."""
    hooks = home_dir / "workspace" / "codingbuddy" / "packages" / "claude-code-plugin" / "hooks"
    hooks.mkdir(parents=True)
    src = hooks / "codingbuddy-hud.py"
    src.write_text("#!/usr/bin/env python3\nprint('test')")
    return src


# ----- v5.6.2 (#1490) fixtures -----


HUD_REQUIRED_LIB_MODULES = [
    "hud_buddy.py",
    "hud_cache_savings.py",
    "hud_context_bar.py",
    "hud_helpers.py",
    "hud_layout.py",
    "hud_rainbow.py",
    "hud_rate_limits.py",
    "hud_session.py",
    "hud_state.py",
    "hud_velocity.py",
    "hud_version.py",
    "tiny_actor_presets.py",
]


@pytest.fixture
def hud_source_with_lib(tmp_path):
    """Synthetic HUD source dir with lib/ containing all 12 required modules."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    (hooks / "codingbuddy-hud.py").write_text("#!/usr/bin/env python3\nprint('stub')")
    lib = hooks / "lib"
    lib.mkdir()
    for name in HUD_REQUIRED_LIB_MODULES:
        (lib / name).write_text(f"# {name} stub")
    return hooks / "codingbuddy-hud.py"


@pytest.fixture
def hud_source_with_lib_and_caches(tmp_path):
    """HUD source with lib/ + __pycache__ + .pytest_cache + test_*.py."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    (hooks / "codingbuddy-hud.py").write_text("# stub")
    lib = hooks / "lib"
    lib.mkdir()
    for name in HUD_REQUIRED_LIB_MODULES:
        (lib / name).write_text(f"# {name} stub")
    # Pollutants that must NOT be copied
    pycache = lib / "__pycache__"
    pycache.mkdir()
    (pycache / "x.cpython-39.pyc").write_text("compiled")
    (lib / "stale.pyc").write_text("compiled")
    pcache = lib / ".pytest_cache"
    pcache.mkdir()
    (pcache / "v").write_text("cache")
    (lib / "test_hud_buddy.py").write_text("def test_x(): pass")
    return hooks / "codingbuddy-hud.py"


@pytest.fixture
def hud_source_no_lib(tmp_path):
    """HUD source without sibling lib/."""
    hooks = tmp_path / "src_hooks"
    hooks.mkdir()
    src = hooks / "codingbuddy-hud.py"
    src.write_text("# stub")
    return src


@pytest.fixture
def real_plugin_hud_source():
    """Path to the real packages/claude-code-plugin/hooks/codingbuddy-hud.py.

    Used by E2E render smoke tests — exercises the real import chain.
    """
    here = Path(__file__).resolve()
    return here.parents[1] / "hooks" / "codingbuddy-hud.py"


class TestInstallStatusline:
    def test_installs_hud_script_to_claude_hud_dir(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        session_start._install_statusline(home_dir, settings_file)

        target = home_dir / ".claude" / "hud" / "codingbuddy-hud.py"
        assert target.exists()
        assert os.access(str(target), os.X_OK)

    def test_sets_statusline_in_settings(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "codingbuddy-hud" in data["statusLine"]["command"]
        assert data["statusLine"]["type"] == "command"

    def test_replaces_omc_statusline(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "node omc-hud.mjs"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "codingbuddy-hud" in data["statusLine"]["command"]
        assert "omc-hud" not in data["statusLine"]["command"]

    def test_skips_custom_statusline(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "my-custom-hud.sh"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert data["statusLine"]["command"] == "my-custom-hud.sh"

    def test_skips_if_already_installed(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "python3 codingbuddy-hud.py"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        # command unchanged (not overwritten with full path)
        assert data["statusLine"]["command"] == "python3 codingbuddy-hud.py"

    def test_noop_when_source_not_found(self, home_dir, settings_file, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DIR", raising=False)
        # Mock _find_hud_source to return None
        monkeypatch.setattr(session_start, "_find_hud_source", lambda: None)
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "statusLine" not in data


class TestFindHudSource:
    def test_finds_from_env(self, tmp_path, monkeypatch):
        hooks = tmp_path / "hooks"
        hooks.mkdir()
        src = hooks / "codingbuddy-hud.py"
        src.write_text("# test")
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(tmp_path))

        result = session_start._find_hud_source()
        assert result is not None
        assert result.name == "codingbuddy-hud.py"

    def test_returns_none_when_not_found(self, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DIR", raising=False)
        # Unlikely to find it in test env without proper cache
        # This may return None or a valid path depending on the test machine
        # Just verify it doesn't crash
        session_start._find_hud_source()


# ============================================================================
# v5.6.2 (#1490) — _install_statusline must sync hooks/lib alongside script.
# Prior versions only ran shutil.copy on the script, leaving lib/ empty
# or stale and causing every Wave 1/2/3 import to fall back to the
# '◕‿◕ CodingBuddy' face.
# ============================================================================


class TestSyncHudAssets:
    """Unit tests verifying _install_statusline now syncs the lib dir."""

    def test_copies_lib_directory(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        target_lib = home_dir / ".claude" / "hud" / "lib"
        assert target_lib.is_dir()

    def test_copies_all_required_hud_modules(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        target_lib = home_dir / ".claude" / "hud" / "lib"
        for name in HUD_REQUIRED_LIB_MODULES:
            assert (target_lib / name).is_file(), f"missing {name} in target lib"

    def test_excludes_pycache_pyc_pytest_cache_and_test_files(
        self,
        home_dir,
        settings_file,
        hud_source_with_lib_and_caches,
        monkeypatch,
    ):
        monkeypatch.setattr(
            session_start,
            "_find_hud_source",
            lambda: hud_source_with_lib_and_caches,
        )
        session_start._install_statusline(home_dir, settings_file)
        target_lib = home_dir / ".claude" / "hud" / "lib"
        assert (target_lib / "hud_buddy.py").is_file()  # real module copied
        assert not (target_lib / "__pycache__").exists()
        assert not (target_lib / ".pytest_cache").exists()
        assert not list(target_lib.glob("*.pyc"))
        assert not list(target_lib.glob("test_*.py"))

    def test_replaces_stale_lib_modules(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        """A pre-existing renamed module from a prior version must be removed."""
        target_lib = home_dir / ".claude" / "hud" / "lib"
        target_lib.mkdir(parents=True)
        (target_lib / "hud_obsolete_v5_5.py").write_text("# stale renamed module")
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        assert not (target_lib / "hud_obsolete_v5_5.py").exists()
        assert (target_lib / "hud_buddy.py").exists()

    def test_idempotent_double_invocation(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        first = sorted(
            p.name for p in (home_dir / ".claude" / "hud" / "lib").iterdir()
        )
        session_start._install_statusline(home_dir, settings_file)
        second = sorted(
            p.name for p in (home_dir / ".claude" / "hud" / "lib").iterdir()
        )
        assert first == second

    def test_writes_version_stamp(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        monkeypatch.setattr(
            session_start, "_get_plugin_version", lambda: "5.6.2"
        )
        session_start._install_statusline(home_dir, settings_file)
        stamp = home_dir / ".claude" / "hud" / ".version"
        assert stamp.exists()
        assert stamp.read_text(encoding="utf-8") == "5.6.2"

    def test_no_lib_in_source_silently_skips(
        self, home_dir, settings_file, hud_source_no_lib, monkeypatch
    ):
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_no_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        assert (home_dir / ".claude" / "hud" / "codingbuddy-hud.py").exists()
        assert not (home_dir / ".claude" / "hud" / "lib").exists()

    def test_settings_still_updated_after_lib_sync(
        self, home_dir, settings_file, hud_source_with_lib, monkeypatch
    ):
        """Lib sync must not regress the settings.json update behavior."""
        monkeypatch.setattr(
            session_start, "_find_hud_source", lambda: hud_source_with_lib
        )
        session_start._install_statusline(home_dir, settings_file)
        data = json.loads(settings_file.read_text())
        assert "codingbuddy-hud" in data["statusLine"]["command"]


class TestHudInstallE2ERegressionGate:
    """🔴 The single regression gate that would have caught v5.6.0/v5.6.1.

    Simulates a user receiving cache 5.6.2 and starting a fresh Claude
    Code session in 4 different starting states, then runs the installed
    script as a real subprocess and asserts the output is NOT the
    fallback face.

    Scenarios:
      - clean   : ~/.claude/hud absent
      - partial : script present, lib absent (current v5.6.1 user state)
      - stale   : lib has obsolete modules from a prior version
      - fresh   : already populated by a prior install (idempotency)
    """

    @pytest.mark.parametrize("scenario", ["clean", "partial", "stale", "fresh"])
    def test_install_then_render_full_status_line(
        self, tmp_path, real_plugin_hud_source, scenario
    ):
        if not real_plugin_hud_source.exists():
            pytest.skip(
                f"real plugin source not found at {real_plugin_hud_source}"
            )

        # Build a fake "home" that mimics the user's machine.
        home = tmp_path / "fake_home"
        home.mkdir()
        settings_file = home / ".claude" / "settings.json"
        settings_file.parent.mkdir(parents=True)
        settings_file.write_text("{}")

        # Mimic Claude Code's plugin manifest so the installed HUD's
        # tier-1 version lookup (hud_version.get_fresh_version →
        # ~/.claude/plugins/installed_plugins.json) resolves to the
        # in-tree plugin version. Without this, CI environments (which
        # have no prior install) leave the version segment empty and
        # the `"CB v" in out` assertion below fails. This mirrors the
        # behavior Claude Code performs after /plugin update on real
        # user machines.
        plugin_root = real_plugin_hud_source.parents[1]
        plugin_json_path = plugin_root / ".claude-plugin" / "plugin.json"
        expected_version = json.loads(plugin_json_path.read_text())["version"]
        plugins_dir = home / ".claude" / "plugins"
        plugins_dir.mkdir(parents=True, exist_ok=True)
        (plugins_dir / "installed_plugins.json").write_text(
            json.dumps(
                {
                    "plugins": {
                        "codingbuddy@jeremydev87": [
                            {
                                "scope": "user",
                                "installPath": str(plugin_root),
                                "version": expected_version,
                            }
                        ]
                    }
                }
            )
        )

        hud_dir = home / ".claude" / "hud"

        if scenario == "partial":
            # Mimic v5.6.1 user: script present, lib absent.
            hud_dir.mkdir(parents=True)
            shutil.copy(real_plugin_hud_source, hud_dir / "codingbuddy-hud.py")
        elif scenario == "stale":
            hud_dir.mkdir(parents=True)
            shutil.copy(real_plugin_hud_source, hud_dir / "codingbuddy-hud.py")
            stale_lib = hud_dir / "lib"
            stale_lib.mkdir()
            (stale_lib / "hud_obsolete_v5_5.py").write_text("# stale")
        elif scenario == "fresh":
            # Pre-populate by running the installer once.
            with mock.patch.object(
                session_start,
                "_find_hud_source",
                return_value=real_plugin_hud_source,
            ):
                session_start._install_statusline(home, settings_file)

        # The actual install under test
        with mock.patch.object(
            session_start,
            "_find_hud_source",
            return_value=real_plugin_hud_source,
        ):
            session_start._install_statusline(home, settings_file)

        installed_script = hud_dir / "codingbuddy-hud.py"
        installed_lib = hud_dir / "lib"

        # Post-condition: script + lib + 12 modules
        assert installed_script.exists()
        assert installed_lib.is_dir()
        for name in HUD_REQUIRED_LIB_MODULES:
            assert (installed_lib / name).exists(), (
                f"scenario={scenario}: missing {name} in target lib"
            )
        # Stale module gone
        if scenario == "stale":
            assert not (installed_lib / "hud_obsolete_v5_5.py").exists()

        # 🔴 The render gate — run the installed script as a real
        # subprocess with an isolated HOME so tier-1 version lookup
        # reads the fake installed_plugins.json we wrote above instead
        # of leaking the developer/CI runner's real home directory.
        stdin_payload = json.dumps(
            {
                "session_id": "regression-gate",
                "model": {"display_name": "Opus 4.6"},
                "cost": {
                    "total_cost_usd": 0.42,
                    "total_duration_ms": 120000,
                },
            }
        )
        isolated_env = {
            "HOME": str(home),
            "PATH": os.environ.get("PATH", ""),
            "LANG": os.environ.get("LANG", ""),
            "LC_ALL": os.environ.get("LC_ALL", ""),
        }
        result = subprocess.run(
            ["python3", str(installed_script)],
            input=stdin_payload,
            capture_output=True,
            text=True,
            timeout=10,
            env=isolated_env,
        )
        assert result.returncode == 0, (
            f"scenario={scenario} crashed: stderr={result.stderr!r}"
        )
        out = result.stdout

        assert out.strip() != "◕‿◕ CodingBuddy", (
            f"FALLBACK FACE REGRESSION (#1490) — scenario={scenario}\n"
            f"stdout: {out!r}\n"
            f"stderr: {result.stderr!r}\n"
            f"installed lib contents: "
            f"{sorted(p.name for p in installed_lib.iterdir())}"
        )

        # Exact version assertion — auto-tracks bump-version.sh so
        # every release gates on a fully-populated version segment.
        assert f"CB v{expected_version}" in out, (
            f"version segment missing/wrong: {out!r} "
            f"(expected 'CB v{expected_version}')"
        )
        assert "Opus 4.6" in out, f"model segment missing: {out!r}"
        assert "$0.42" in out, f"cost segment missing: {out!r}"

        # Stamp file assertion
        stamp = hud_dir / ".version"
        assert stamp.exists(), f"scenario={scenario}: .version stamp missing"
        assert stamp.read_text(encoding="utf-8").strip() == expected_version
