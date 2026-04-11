#!/usr/bin/env bash
# verify-install-simulation.sh — pre-release regression gate for #1490
#
# Simulates a fresh user receiving cache 5.6.x and starting Claude Code
# for the first time. Runs _install_statusline against the real plugin
# hooks/ directory in an isolated tmpdir, then executes the installed
# script as a real subprocess and asserts the output is the full status
# line — not the bare '◕‿◕ CodingBuddy' fallback face.
#
# This script complements pytest unit/E2E tests by exercising the
# exact code path a user hits (including the file system, chmod, and
# subprocess invocation). Run it manually before pushing release
# branches and from CI on every PR.
#
# Exit codes:
#   0 — full status line rendered, all assertions passed
#   1 — fallback face detected or required tokens missing
#   2 — install crashed before render

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PLUGIN_ROOT/hooks"

if [ ! -f "$HOOKS_DIR/codingbuddy-hud.py" ]; then
  echo "[verify-install-simulation] FAIL: HUD source not found at $HOOKS_DIR/codingbuddy-hud.py" >&2
  exit 2
fi

TMPHOME="$(mktemp -d)"
trap 'rm -rf "$TMPHOME"' EXIT

echo "[verify-install-simulation] simulating user install in $TMPHOME"

PLUGIN_ROOT="$PLUGIN_ROOT" HOOKS_DIR="$HOOKS_DIR" TMPHOME="$TMPHOME" \
python3 - <<'PYEOF'
import json
import os
import subprocess
import sys
from pathlib import Path

plugin_root = os.environ["PLUGIN_ROOT"]
hooks_dir = os.environ["HOOKS_DIR"]
tmphome = os.environ["TMPHOME"]

# Make session-start.py importable (hyphenated filename)
sys.path.insert(0, hooks_dir)
import importlib.util as importutil
spec = importutil.spec_from_file_location(
    "session_start", os.path.join(hooks_dir, "session-start.py")
)
session_start = importutil.module_from_spec(spec)
spec.loader.exec_module(session_start)

# Force the installer to use the in-tree source rather than any cached
# copy on the developer's machine. This guarantees the script under
# test is exactly what's about to ship.
hud_source = Path(hooks_dir) / "codingbuddy-hud.py"
session_start._find_hud_source = lambda: hud_source

home = Path(tmphome)
settings_file = home / ".claude" / "settings.json"
settings_file.parent.mkdir(parents=True, exist_ok=True)
settings_file.write_text("{}")

plugin_root_path = Path(plugin_root)

# Mimic Claude Code's plugin manifest so the installed HUD's tier-1
# version lookup (read_installed_version → ~/.claude/plugins/installed_plugins.json)
# resolves to the version we are about to ship. Without this the
# isolated tmpdir has no installed_plugins.json and the version
# segment renders empty.
plugin_json = plugin_root_path / ".claude-plugin" / "plugin.json"
import json as _json
expected_version = _json.loads(plugin_json.read_text())["version"]
plugins_dir = home / ".claude" / "plugins"
plugins_dir.mkdir(parents=True, exist_ok=True)
(plugins_dir / "installed_plugins.json").write_text(
    _json.dumps({
        "plugins": {
            "codingbuddy@jeremydev87": [
                {
                    "scope": "user",
                    "installPath": str(plugin_root_path),
                    "version": expected_version,
                }
            ]
        }
    })
)

# Run the installer the same way session-start hook would
try:
    session_start._install_statusline(home, settings_file)
except Exception as exc:
    print(f"[verify-install-simulation] FAIL: installer crashed: {exc}", file=sys.stderr)
    sys.exit(2)

installed_script = home / ".claude" / "hud" / "codingbuddy-hud.py"
installed_lib = home / ".claude" / "hud" / "lib"

if not installed_script.exists():
    print("[verify-install-simulation] FAIL: script not installed", file=sys.stderr)
    sys.exit(2)
if not installed_lib.is_dir():
    print("[verify-install-simulation] FAIL: lib/ not synced", file=sys.stderr)
    sys.exit(1)

# Verify the 12 critical modules are present
required = [
    "hud_buddy.py", "hud_cache_savings.py", "hud_context_bar.py",
    "hud_helpers.py", "hud_layout.py", "hud_rainbow.py",
    "hud_rate_limits.py", "hud_session.py", "hud_state.py",
    "hud_velocity.py", "hud_version.py", "tiny_actor_presets.py",
]
missing = [m for m in required if not (installed_lib / m).is_file()]
if missing:
    print(
        f"[verify-install-simulation] FAIL: missing lib modules: {missing}",
        file=sys.stderr,
    )
    sys.exit(1)

# Render via subprocess — exactly how Claude Code invokes the statusLine
payload = json.dumps({
    "session_id": "verify-install-simulation",
    "model": {"display_name": "Opus 4.6"},
    "cost": {"total_cost_usd": 0.42, "total_duration_ms": 120000},
})
# Isolate HOME so the installed script reads the tmpdir installation
# instead of leaking the developer's real ~/.claude/plugins/installed_plugins.json.
# Without this, hud_version.get_fresh_version's tier-1 lookup picks up
# the real machine's plugin version and the assertion below cannot
# verify that the v5.6.2 prep actually flows through the install path.
isolated_env = {
    "HOME": str(home),
    "PATH": os.environ.get("PATH", ""),
    "LANG": os.environ.get("LANG", ""),
    "LC_ALL": os.environ.get("LC_ALL", ""),
}
result = subprocess.run(
    ["python3", str(installed_script)],
    input=payload,
    capture_output=True,
    text=True,
    timeout=10,
    env=isolated_env,
)
out = result.stdout
print(f"[verify-install-simulation] stdout={out!r}")
print(f"[verify-install-simulation] stderr={result.stderr!r}")

if result.returncode != 0:
    print(
        f"[verify-install-simulation] FAIL: render exited {result.returncode}",
        file=sys.stderr,
    )
    sys.exit(1)

if out.strip() == "\u25d5\u203f\u25d5 CodingBuddy":
    print(
        "[verify-install-simulation] FAIL: fallback face only — "
        "installer did not produce a working HUD (#1490 regression)",
        file=sys.stderr,
    )
    sys.exit(1)

# expected_version was resolved earlier from plugin.json so the
# assertion auto-tracks bump-version.sh.
required_tokens = [
    f"CB v{expected_version}",  # version exactly matches plugin.json
    "Opus 4.6",
    "$0.42",
]
for token in required_tokens:
    if token not in out:
        print(
            f"[verify-install-simulation] FAIL: missing token {token!r} in stdout",
            file=sys.stderr,
        )
        sys.exit(1)

# Verify version stamp file
stamp = home / ".claude" / "hud" / ".version"
if not stamp.exists():
    print("[verify-install-simulation] FAIL: .version stamp not written", file=sys.stderr)
    sys.exit(1)
stamp_value = stamp.read_text(encoding="utf-8").strip()
if stamp_value != expected_version:
    print(
        f"[verify-install-simulation] FAIL: stamp {stamp_value!r} != "
        f"plugin.json version {expected_version!r}",
        file=sys.stderr,
    )
    sys.exit(1)

print(f"[verify-install-simulation] PASS: full status line rendered (v{expected_version})")
PYEOF
