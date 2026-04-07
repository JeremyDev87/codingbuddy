"""Tests for permission_forecast module (#1418).

Covers:
- format_permission_forecast: no-forecast, read-only, repo-write, network, external
- format_permission_forecast_from_mcp: MCP response extraction
- generate_standalone_forecast: per-mode standalone forecasts
"""

import sys
from pathlib import Path

# Ensure lib/ is importable
_lib_dir = str(Path(__file__).resolve().parent.parent / "hooks" / "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from permission_forecast import (
    format_permission_forecast,
    format_permission_forecast_from_mcp,
    generate_standalone_forecast,
)


class TestFormatPermissionForecast:
    """Tests for format_permission_forecast()."""

    def test_empty_classes_returns_empty(self):
        assert format_permission_forecast([]) == ""

    def test_readonly_only_returns_empty(self):
        """read-only with no bundles is not worth displaying."""
        assert format_permission_forecast(["read-only"]) == ""

    def test_readonly_with_bundles_shows_bundles(self):
        bundles = [{"name": "Run checks", "permissionClass": "read-only"}]
        result = format_permission_forecast(["read-only"], bundles)
        assert "Permissions:" in result
        assert "Run checks" in result

    def test_repo_write_without_bundles(self):
        result = format_permission_forecast(["read-only", "repo-write"])
        assert result == "Permissions: repo-write"

    def test_repo_write_with_bundle(self):
        bundles = [{"name": "Code changes", "permissionClass": "repo-write"}]
        result = format_permission_forecast(["read-only", "repo-write"], bundles)
        assert result == "Permissions: repo-write (Code changes)"

    def test_multiple_bundles(self):
        bundles = [
            {"name": "Code changes", "permissionClass": "repo-write"},
            {"name": "Ship changes", "permissionClass": "external"},
        ]
        result = format_permission_forecast(
            ["read-only", "repo-write", "external"], bundles
        )
        assert "repo-write (Code changes)" in result
        assert "external (Ship changes)" in result
        assert " | " in result

    def test_network_class(self):
        bundles = [{"name": "Install dependencies", "permissionClass": "network"}]
        result = format_permission_forecast(["read-only", "network"], bundles)
        assert "network (Install dependencies)" in result

    def test_destructive_class(self):
        result = format_permission_forecast(["read-only", "destructive"])
        assert "destructive" in result

    def test_external_class_without_bundles(self):
        result = format_permission_forecast(["read-only", "external"])
        assert result == "Permissions: external"

    def test_all_classes(self):
        result = format_permission_forecast(
            ["read-only", "repo-write", "network", "destructive", "external"]
        )
        assert "repo-write" in result
        assert "network" in result
        assert "destructive" in result
        assert "external" in result


class TestFormatPermissionForecastFromMcp:
    """Tests for format_permission_forecast_from_mcp()."""

    def test_none_forecast_returns_empty(self):
        assert format_permission_forecast_from_mcp(None) == ""

    def test_empty_dict_returns_empty(self):
        assert format_permission_forecast_from_mcp({}) == ""

    def test_readonly_forecast(self):
        forecast = {
            "permissionClasses": ["read-only"],
            "approvalBundles": [],
            "permissionSummary": "PLAN mode requires read-only permissions",
        }
        assert format_permission_forecast_from_mcp(forecast) == ""

    def test_act_mode_forecast(self):
        forecast = {
            "permissionClasses": ["read-only", "repo-write"],
            "approvalBundles": [
                {
                    "name": "Code changes",
                    "actions": ["file edit", "git add", "git commit"],
                    "permissionClass": "repo-write",
                    "reason": "Implementation involves editing files",
                }
            ],
            "permissionSummary": "ACT mode requires repo-write permissions",
        }
        result = format_permission_forecast_from_mcp(forecast)
        assert "repo-write (Code changes)" in result

    def test_ship_forecast(self):
        forecast = {
            "permissionClasses": ["read-only", "repo-write", "external"],
            "approvalBundles": [
                {
                    "name": "Ship changes",
                    "actions": ["git add", "git commit", "git push", "gh pr create"],
                    "permissionClass": "external",
                    "reason": "Committing, pushing, and creating a PR",
                }
            ],
            "permissionSummary": "ACT mode requires external permissions",
        }
        result = format_permission_forecast_from_mcp(forecast)
        assert "external (Ship changes)" in result

    def test_multiple_bundles_from_mcp(self):
        forecast = {
            "permissionClasses": ["read-only", "repo-write", "network", "external"],
            "approvalBundles": [
                {"name": "Ship changes", "permissionClass": "external"},
                {"name": "Install dependencies", "permissionClass": "network"},
            ],
        }
        result = format_permission_forecast_from_mcp(forecast)
        assert "external (Ship changes)" in result
        assert "network (Install dependencies)" in result


class TestGenerateStandaloneForecast:
    """Tests for generate_standalone_forecast()."""

    def test_plan_mode_returns_empty(self):
        """PLAN mode is read-only, no forecast needed."""
        assert generate_standalone_forecast("PLAN") == ""

    def test_eval_mode_returns_empty(self):
        """EVAL mode is read-only, no forecast needed."""
        assert generate_standalone_forecast("EVAL") == ""

    def test_act_mode_shows_repo_write(self):
        result = generate_standalone_forecast("ACT")
        assert "Permissions:" in result
        assert "repo-write" in result
        assert "Code changes" in result

    def test_auto_mode_shows_repo_write_and_external(self):
        result = generate_standalone_forecast("AUTO")
        assert "repo-write" in result
        assert "external" in result

    def test_case_insensitive(self):
        assert generate_standalone_forecast("act") == generate_standalone_forecast("ACT")
        assert generate_standalone_forecast("Plan") == generate_standalone_forecast("PLAN")

    def test_unknown_mode_returns_empty(self):
        assert generate_standalone_forecast("UNKNOWN") == ""
