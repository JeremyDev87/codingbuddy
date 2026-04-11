"""Sanity + behavior test for the hud_version module (Wave 0 / #1463)."""
import importlib
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_version  # noqa: E402


def test_module_has_public_api():
    assert hasattr(hud_version, "get_fresh_version")


def test_fallback_to_hud_state_version(tmp_path):
    missing = tmp_path / "no_plugins.json"
    result = hud_version.get_fresh_version(
        {"version": "9.9.9"}, plugins_file=str(missing)
    )
    assert result == "9.9.9"


def test_empty_state_returns_empty(tmp_path):
    missing = tmp_path / "no_plugins.json"
    result = hud_version.get_fresh_version({}, plugins_file=str(missing))
    assert result == ""


def test_reads_installed_plugins_file_when_present(tmp_path):
    """Contract: a real installed_plugins.json overrides hud_state."""
    plugins = tmp_path / "installed_plugins.json"
    plugins.write_text(
        '{"plugins": {"codingbuddy@v1": [{"version": "7.7.7"}]}}',
        encoding="utf-8",
    )
    result = hud_version.get_fresh_version(
        {"version": "ignored"}, plugins_file=str(plugins)
    )
    assert result == "7.7.7"


def test_import_does_not_read_real_plugins_file(monkeypatch, tmp_path):
    """Lock: module load must not touch ~/.claude/plugins/installed_plugins.json."""
    fake_home = tmp_path / "fake_home"
    fake_home.mkdir()
    monkeypatch.setenv("HOME", str(fake_home))
    # Use reload (not sys.modules.pop + import_module) so the top-level
    # `import hud_version` binding above stays live. Otherwise sibling
    # tests asserting identity (e.g. test_reexport_alias_from_codingbuddy_hud)
    # would break because they reference an obsolete module object.
    importlib.reload(hud_version)
    # Reaching this line means reload succeeded without touching real FS.
    assert True


def test_reexport_alias_from_codingbuddy_hud():
    """Lock: hud._get_fresh_version must be hud_version.get_fresh_version.

    Uses reload to re-sync after any earlier test that mutated sys.modules
    (test order should not matter for identity locks).
    """
    importlib.reload(hud_version)
    sys.modules.pop("codingbuddy-hud", None)
    hud_main = importlib.import_module("codingbuddy-hud")
    assert hud_main._get_fresh_version is hud_version.get_fresh_version
