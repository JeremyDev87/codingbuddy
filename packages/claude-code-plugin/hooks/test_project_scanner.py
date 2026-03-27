#!/usr/bin/env python3
"""Unit tests for project_scanner.py

Run with: python3 -m pytest test_project_scanner.py -v
"""
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / "lib"))

from project_scanner import (
    scan_package_json,
    scan_file_count,
    scan_coverage,
    scan_api_endpoints,
    detect_framework,
    scan_project,
    load_scan_cache,
    save_scan_cache,
    get_agent_recommendations,
    CACHE_FILENAME,
)


class TestScanPackageJson:
    """Tests for scan_package_json."""

    def test_reads_name_and_version(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg = {"name": "my-app", "version": "2.1.0"}
            Path(tmpdir, "package.json").write_text(json.dumps(pkg))
            result = scan_package_json(tmpdir)
            assert result["name"] == "my-app"
            assert result["version"] == "2.1.0"

    def test_missing_package_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = scan_package_json(tmpdir)
            assert result["name"] == "unknown"
            assert result["version"] is None

    def test_invalid_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "package.json").write_text("not json{{{")
            result = scan_package_json(tmpdir)
            assert result["name"] == "unknown"


class TestDetectFramework:
    """Tests for detect_framework."""

    def test_detects_nextjs(self):
        deps = {"next": "15.0.0", "react": "19.0.0"}
        result = detect_framework(deps, {})
        assert "Next.js" in result

    def test_detects_react(self):
        deps = {"react": "18.0.0"}
        result = detect_framework(deps, {})
        assert "React" in result

    def test_detects_typescript(self):
        dev_deps = {"typescript": "5.3.0"}
        result = detect_framework({}, dev_deps)
        assert "TypeScript" in result

    def test_detects_nextjs_with_typescript(self):
        deps = {"next": "15.0.0"}
        dev_deps = {"typescript": "5.3.0"}
        result = detect_framework(deps, dev_deps)
        assert "Next.js" in result
        assert "TypeScript" in result

    def test_detects_vue(self):
        deps = {"vue": "3.4.0"}
        result = detect_framework(deps, {})
        assert "Vue" in result

    def test_detects_nestjs(self):
        deps = {"@nestjs/core": "10.0.0"}
        result = detect_framework(deps, {})
        assert "NestJS" in result

    def test_empty_deps(self):
        result = detect_framework({}, {})
        assert result is None

    def test_unknown_deps(self):
        deps = {"some-lib": "1.0.0"}
        result = detect_framework(deps, {})
        assert result is None


class TestScanFileCount:
    """Tests for scan_file_count."""

    def test_counts_source_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            (src / "index.ts").write_text("code")
            (src / "utils.ts").write_text("code")
            (src / "app.tsx").write_text("code")
            result = scan_file_count(tmpdir)
            assert result == 3

    def test_counts_nested_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            nested = Path(tmpdir) / "src" / "deep" / "nested"
            nested.mkdir(parents=True)
            (nested / "file.ts").write_text("code")
            result = scan_file_count(tmpdir)
            assert result == 1

    def test_no_src_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = scan_file_count(tmpdir)
            assert result == 0

    def test_excludes_node_modules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            (src / "app.ts").write_text("code")
            nm = Path(tmpdir) / "src" / "node_modules"
            nm.mkdir()
            (nm / "lib.ts").write_text("code")
            result = scan_file_count(tmpdir)
            assert result == 1


class TestScanCoverage:
    """Tests for scan_coverage."""

    def test_reads_json_summary(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cov_dir = Path(tmpdir) / "coverage"
            cov_dir.mkdir()
            report = {
                "total": {
                    "lines": {"pct": 67.5},
                    "statements": {"pct": 70.0},
                }
            }
            (cov_dir / "coverage-summary.json").write_text(json.dumps(report))
            result = scan_coverage(tmpdir)
            assert result == 67

    def test_no_coverage_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = scan_coverage(tmpdir)
            assert result is None

    def test_invalid_coverage_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cov_dir = Path(tmpdir) / "coverage"
            cov_dir.mkdir()
            (cov_dir / "coverage-summary.json").write_text("bad json")
            result = scan_coverage(tmpdir)
            assert result is None


class TestScanApiEndpoints:
    """Tests for scan_api_endpoints."""

    def test_counts_api_route_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            api = Path(tmpdir) / "src" / "app" / "api"
            api.mkdir(parents=True)
            (api / "route.ts").write_text("export async function GET() {}")
            users = api / "users"
            users.mkdir()
            (users / "route.ts").write_text("export async function GET() {}")
            result = scan_api_endpoints(tmpdir)
            assert result == 2

    def test_no_api_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = scan_api_endpoints(tmpdir)
            assert result == 0

    def test_counts_pages_api_routes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            api = Path(tmpdir) / "pages" / "api"
            api.mkdir(parents=True)
            (api / "hello.ts").write_text("export default handler")
            (api / "users.ts").write_text("export default handler")
            result = scan_api_endpoints(tmpdir)
            assert result == 2

    def test_counts_nestjs_controllers(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            src = Path(tmpdir) / "src"
            src.mkdir()
            (src / "app.controller.ts").write_text("@Controller()")
            (src / "users.controller.ts").write_text("@Controller()")
            result = scan_api_endpoints(tmpdir)
            assert result == 2


class TestScanCache:
    """Tests for cache load/save."""

    def test_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            data = {"name": "app", "framework": "Next.js"}
            save_scan_cache(tmpdir, data)
            loaded = load_scan_cache(tmpdir)
            assert loaded is not None
            assert loaded["name"] == "app"

    def test_load_missing_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = load_scan_cache(tmpdir)
            assert result is None

    def test_cache_has_timestamp(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            save_scan_cache(tmpdir, {"name": "app"})
            loaded = load_scan_cache(tmpdir)
            assert "_cached_at" in loaded

    def test_stale_cache_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            data = {"name": "app", "_cached_at": 0}  # epoch = very old
            cache_dir = Path(tmpdir) / ".codingbuddy"
            cache_dir.mkdir()
            (cache_dir / CACHE_FILENAME).write_text(json.dumps(data))
            result = load_scan_cache(tmpdir, max_age_seconds=60)
            assert result is None


class TestScanProject:
    """Tests for scan_project - full scan orchestration."""

    def test_full_scan(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Setup package.json
            pkg = {
                "name": "test-app",
                "version": "1.0.0",
                "dependencies": {"next": "15.0.0", "react": "19.0.0"},
                "devDependencies": {"typescript": "5.3.0"},
            }
            Path(tmpdir, "package.json").write_text(json.dumps(pkg))
            # Setup src files
            src = Path(tmpdir) / "src"
            src.mkdir()
            (src / "index.ts").write_text("code")
            (src / "app.tsx").write_text("code")

            result = scan_project(tmpdir)
            assert result["name"] == "test-app"
            assert "Next.js" in result["framework"]
            assert result["file_count"] == 2

    def test_scan_creates_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg = {"name": "cached-app", "version": "1.0.0"}
            Path(tmpdir, "package.json").write_text(json.dumps(pkg))
            scan_project(tmpdir)
            cache_file = Path(tmpdir) / ".codingbuddy" / CACHE_FILENAME
            assert cache_file.exists()

    def test_scan_uses_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg = {"name": "cached-app", "version": "1.0.0"}
            Path(tmpdir, "package.json").write_text(json.dumps(pkg))
            # First scan
            scan_project(tmpdir)
            # Modify package.json - but cache should be used
            pkg["name"] = "modified"
            Path(tmpdir, "package.json").write_text(json.dumps(pkg))
            result = scan_project(tmpdir)
            assert result["name"] == "cached-app"  # still cached

    def test_scan_empty_project(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = scan_project(tmpdir)
            assert result["name"] == "unknown"


class TestGetAgentRecommendations:
    """Tests for get_agent_recommendations."""

    def test_recommends_frontend_for_react(self):
        scan = {"framework": "React + TypeScript", "coverage": 90}
        agents = {
            "frontend-developer": {
                "name": "Frontend Developer",
                "visual": {"eye": "\u2605", "colorAnsi": "yellow"},
            }
        }
        recs = get_agent_recommendations(scan, agents)
        names = [r["agent"] for r in recs]
        assert "Frontend Developer" in names or "Frontend" in " ".join(names)

    def test_recommends_test_engineer_for_low_coverage(self):
        scan = {"framework": "React", "coverage": 50}
        agents = {
            "test-engineer": {
                "name": "Test Engineer",
                "visual": {"eye": "\u25c9", "colorAnsi": "green"},
            }
        }
        recs = get_agent_recommendations(scan, agents)
        names = [r["agent"] for r in recs]
        assert "Test Engineer" in names or "Test" in " ".join(names)

    def test_recommends_security_for_api_endpoints(self):
        scan = {"api_endpoints": 3}
        agents = {
            "security-specialist": {
                "name": "Security Specialist",
                "visual": {"eye": "\u25ee", "colorAnsi": "red"},
            }
        }
        recs = get_agent_recommendations(scan, agents)
        names = [r["agent"] for r in recs]
        assert "Security" in " ".join(names)

    def test_no_recommendations_when_no_issues(self):
        scan = {"coverage": 95}
        agents = {}
        recs = get_agent_recommendations(scan, agents)
        assert isinstance(recs, list)

    def test_uses_agent_visual_fields(self):
        scan = {"coverage": 40}
        agents = {
            "test-engineer": {
                "name": "Test Engineer",
                "visual": {"eye": "\u25c9", "colorAnsi": "green"},
            }
        }
        recs = get_agent_recommendations(scan, agents)
        if recs:
            assert recs[0]["eye"] == "\u25c9"
            assert recs[0]["colorAnsi"] == "green"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
