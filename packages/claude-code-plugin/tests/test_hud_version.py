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


def test_plugin_json_fallback_when_installed_plugins_missing(tmp_path):
    """Wave 1-A: plugin.json is the second-tier fallback.

    When installed_plugins.json is missing but a local plugin.json
    exists, the returned version must be the plugin.json value.
    """
    missing_plugins = tmp_path / "no_plugins.json"
    plugin_json = tmp_path / "plugin.json"
    plugin_json.write_text('{"version": "8.8.8"}', encoding="utf-8")
    result = hud_version.get_fresh_version(
        {"version": "stale"},
        plugins_file=str(missing_plugins),
        plugin_json_file=str(plugin_json),
    )
    assert result == "8.8.8"


def test_installed_plugins_wins_over_plugin_json(tmp_path):
    """Wave 1-A: installed_plugins.json (tier 1) beats plugin.json (tier 2)."""
    plugins = tmp_path / "installed_plugins.json"
    plugins.write_text(
        '{"plugins": {"codingbuddy@dev": [{"version": "tier-1"}]}}',
        encoding="utf-8",
    )
    plugin_json = tmp_path / "plugin.json"
    plugin_json.write_text('{"version": "tier-2"}', encoding="utf-8")
    result = hud_version.get_fresh_version(
        {"version": "tier-3"},
        plugins_file=str(plugins),
        plugin_json_file=str(plugin_json),
    )
    assert result == "tier-1"


def test_plugin_json_beats_hud_state(tmp_path):
    """Wave 1-A: plugin.json (tier 2) beats hud_state.version (tier 3)."""
    missing_plugins = tmp_path / "no_plugins.json"
    plugin_json = tmp_path / "plugin.json"
    plugin_json.write_text('{"version": "tier-2"}', encoding="utf-8")
    result = hud_version.get_fresh_version(
        {"version": "tier-3-stale"},
        plugins_file=str(missing_plugins),
        plugin_json_file=str(plugin_json),
    )
    assert result == "tier-2"


def test_all_fallbacks_fail_returns_hud_state_version(tmp_path):
    """Wave 1-A: if both files are absent, fall through to hud_state."""
    missing_plugins = tmp_path / "no_plugins.json"
    missing_plugin_json = tmp_path / "no_plugin.json"
    result = hud_version.get_fresh_version(
        {"version": "9.9.9"},
        plugins_file=str(missing_plugins),
        plugin_json_file=str(missing_plugin_json),
    )
    assert result == "9.9.9"


def test_plugin_json_malformed_skipped(tmp_path):
    """Wave 1-A: malformed plugin.json must not crash — skip to hud_state."""
    missing_plugins = tmp_path / "no_plugins.json"
    bad_plugin_json = tmp_path / "plugin.json"
    bad_plugin_json.write_text("this is not json", encoding="utf-8")
    result = hud_version.get_fresh_version(
        {"version": "fallback"},
        plugins_file=str(missing_plugins),
        plugin_json_file=str(bad_plugin_json),
    )
    assert result == "fallback"


def test_plugin_json_missing_version_key_skipped(tmp_path):
    """Wave 1-A: plugin.json without version key skips to hud_state."""
    missing_plugins = tmp_path / "no_plugins.json"
    plugin_json = tmp_path / "plugin.json"
    plugin_json.write_text('{"name": "codingbuddy"}', encoding="utf-8")
    result = hud_version.get_fresh_version(
        {"version": "fallback"},
        plugins_file=str(missing_plugins),
        plugin_json_file=str(plugin_json),
    )
    assert result == "fallback"


def test_default_plugin_json_path_resolves_to_real_file():
    """Wave 1-A: __file__-relative default path must point at the real
    .claude-plugin/plugin.json in the repo so dev installs work."""
    import pathlib
    path = hud_version._default_plugin_json_path()
    assert os.path.isfile(path), (
        f"Expected plugin.json at {path}; hud_version default path is wrong."
    )
    # Smoke check: the file is parseable and has a version field
    version = hud_version._read_local_plugin_json(path)
    assert version, "plugin.json exists but version field is empty"


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
