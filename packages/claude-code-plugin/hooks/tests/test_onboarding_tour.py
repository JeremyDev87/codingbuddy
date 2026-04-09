#!/usr/bin/env python3
"""Unit tests for onboarding_tour.py — Smart First Prompt (#1438).

Tests generate_suggestions() and scan-aware onboarding integration.
"""
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

from onboarding_tour import (
    generate_suggestions,
    is_first_run,
    mark_onboarded,
    render_onboarding_tour,
)


# ── generate_suggestions tests ──────────────────────────────────────


class TestGenerateSuggestions:
    """Tests for generate_suggestions mapping scan data to prompts."""

    def test_low_coverage_suggests_auto_improve(self):
        scan = {"coverage": 42, "name": "my-app"}
        suggestions = generate_suggestions(scan)
        assert len(suggestions) >= 1
        cov_suggestion = next(
            (s for s in suggestions if "coverage" in s["reason"].lower()), None
        )
        assert cov_suggestion is not None
        assert cov_suggestion["mode"] == "AUTO"
        assert "42%" in cov_suggestion["reason"]

    def test_high_coverage_no_coverage_suggestion(self):
        scan = {"coverage": 95, "name": "my-app"}
        suggestions = generate_suggestions(scan)
        cov_suggestion = next(
            (s for s in suggestions if "coverage" in s.get("reason", "").lower()),
            None,
        )
        assert cov_suggestion is None

    def test_framework_suggests_plan(self):
        scan = {"framework": "Next.js 15 + TypeScript", "name": "my-app"}
        suggestions = generate_suggestions(scan)
        fw_suggestion = next(
            (s for s in suggestions if s["mode"] == "PLAN"), None
        )
        assert fw_suggestion is not None
        assert "Next.js" in fw_suggestion["prompt"] or "Next.js" in fw_suggestion["reason"]

    def test_api_endpoints_suggests_eval(self):
        scan = {"api_endpoints": 5, "name": "my-app"}
        suggestions = generate_suggestions(scan)
        api_suggestion = next(
            (s for s in suggestions if "endpoint" in s["reason"].lower()
             or "API" in s["reason"]),
            None,
        )
        assert api_suggestion is not None
        assert api_suggestion["mode"] == "EVAL"

    def test_empty_scan_returns_generic_fallback(self):
        scan = {}
        suggestions = generate_suggestions(scan)
        assert len(suggestions) >= 1
        # Fallback suggestions should still have mode and prompt
        for s in suggestions:
            assert "mode" in s
            assert "prompt" in s

    def test_minimal_scan_returns_generic_fallback(self):
        scan = {"name": "unknown"}
        suggestions = generate_suggestions(scan)
        assert len(suggestions) >= 1

    def test_suggestion_structure(self):
        scan = {"coverage": 50, "framework": "React 18", "api_endpoints": 3}
        suggestions = generate_suggestions(scan)
        for s in suggestions:
            assert "mode" in s
            assert s["mode"] in ("PLAN", "ACT", "AUTO", "EVAL")
            assert "prompt" in s
            assert "reason" in s
            assert isinstance(s["prompt"], str)
            assert len(s["prompt"]) > 0

    def test_multiple_findings_produce_multiple_suggestions(self):
        scan = {
            "coverage": 40,
            "framework": "Next.js 15",
            "api_endpoints": 3,
        }
        suggestions = generate_suggestions(scan)
        assert len(suggestions) >= 2

    def test_localized_suggestions_ko(self):
        scan = {"coverage": 42}
        suggestions = generate_suggestions(scan, language="ko")
        assert len(suggestions) >= 1
        # Korean suggestions should exist
        cov = next(
            (s for s in suggestions if "coverage" in s["reason"].lower()
             or "커버리지" in s["reason"]),
            None,
        )
        assert cov is not None

    def test_files_without_coverage_suggests_adding_tests(self):
        scan = {"file_count": 30, "name": "my-app"}
        suggestions = generate_suggestions(scan)
        assert len(suggestions) >= 1
        test_suggestion = next(
            (s for s in suggestions if "test" in s["prompt"].lower()
             or "test" in s["reason"].lower()),
            None,
        )
        assert test_suggestion is not None

    def test_nestjs_framework_suggestion(self):
        scan = {"framework": "NestJS 10 + TypeScript"}
        suggestions = generate_suggestions(scan)
        fw = next((s for s in suggestions if s["mode"] == "PLAN"), None)
        assert fw is not None
        assert "NestJS" in fw["prompt"] or "NestJS" in fw["reason"]

    def test_vue_framework_suggestion(self):
        scan = {"framework": "Vue 3 + TypeScript"}
        suggestions = generate_suggestions(scan)
        fw = next((s for s in suggestions if s["mode"] == "PLAN"), None)
        assert fw is not None


# ── render_onboarding_tour integration tests ────────────────────────


class TestRenderOnboardingTourWithScan:
    """Tests for scan-aware onboarding tour rendering."""

    def test_tour_with_scan_replaces_examples(self):
        scan = {"coverage": 42, "framework": "React 18"}
        output = render_onboarding_tour(language="en", scan_result=scan)
        # Should contain project-specific content
        assert "42%" in output or "coverage" in output.lower()

    def test_tour_without_scan_shows_generic(self):
        output = render_onboarding_tour(language="en")
        # Generic example should still appear
        assert "PLAN" in output

    def test_tour_with_empty_scan_shows_generic(self):
        output = render_onboarding_tour(language="en", scan_result={})
        assert "PLAN" in output

    def test_tour_with_scan_still_has_structure(self):
        scan = {"coverage": 50, "api_endpoints": 3}
        output = render_onboarding_tour(language="en", scan_result=scan)
        # Tour structure should be preserved
        assert "Welcome" in output or "welcome" in output.lower()
        # Step numbers should exist
        assert "\u2460" in output  # circled 1

    def test_tour_korean_with_scan(self):
        scan = {"coverage": 42}
        output = render_onboarding_tour(language="ko", scan_result=scan)
        assert "환영" in output  # Welcome in Korean


# ── is_first_run / mark_onboarded tests ─────────────────────────────


class TestFirstRunDetection:
    """Tests for first-run detection and marking."""

    def test_first_run_when_no_flag(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("onboarding_tour._onboarded_dir", return_value=tmpdir):
                # Remove flag if exists
                flag = os.path.join(tmpdir, "onboarded")
                if os.path.exists(flag):
                    os.remove(flag)
                assert is_first_run() is True

    def test_not_first_run_when_flag_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "onboarded").touch()
            with patch("onboarding_tour._onboarded_dir", return_value=tmpdir):
                assert is_first_run() is False

    def test_skip_env_var(self):
        with patch.dict(os.environ, {"CODINGBUDDY_SKIP_TOUR": "1"}):
            assert is_first_run() is False

    def test_mark_onboarded_creates_flag(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("onboarding_tour._onboarded_dir", return_value=tmpdir):
                mark_onboarded()
                assert os.path.isfile(os.path.join(tmpdir, "onboarded"))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
