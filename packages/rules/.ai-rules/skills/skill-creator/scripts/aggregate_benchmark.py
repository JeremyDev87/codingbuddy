#!/usr/bin/env python3
"""Aggregate benchmark results from an iteration directory.

Reads grading.json and timing.json from each eval-N/{with_skill,without_skill}/
subdirectory and produces benchmark.json + benchmark.md in the iteration directory.

Usage:
    python aggregate_benchmark.py <iteration-dir> --skill-name <name>

Example:
    python aggregate_benchmark.py workspace/iteration-1 --skill-name test-driven-development

Requirements:
    Python 3.8+ (standard library only)
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggregate benchmark results from a skill evaluation iteration.",
        epilog=(
            "Example:\n"
            "  python aggregate_benchmark.py workspace/iteration-1 "
            "--skill-name test-driven-development"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "iteration_dir",
        type=str,
        help="Path to the iteration directory (e.g. workspace/iteration-1)",
    )
    parser.add_argument(
        "--skill-name",
        required=True,
        help="Skill name in kebab-case (e.g. test-driven-development)",
    )
    return parser.parse_args(argv)


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    """Load a JSON file, returning None on failure."""
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[WARN] File not found, skipping: {path}", file=sys.stderr)
        return None
    except json.JSONDecodeError as exc:
        print(f"[WARN] Invalid JSON in {path}: {exc}", file=sys.stderr)
        return None


def _pass_rate(grading: Dict[str, Any]) -> float:
    """Calculate pass rate from a grading.json structure."""
    expectations = grading.get("expectations", [])
    if not expectations:
        return 0.0
    passed = sum(1 for e in expectations if e.get("passed", False))
    return passed / len(expectations)


def _mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _stddev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    variance = sum((x - m) ** 2 for x in values) / len(values)
    return math.sqrt(variance)


def _extract_iteration_number(iteration_dir: Path) -> int:
    """Extract iteration number from directory name like 'iteration-3'."""
    name = iteration_dir.name
    if name.startswith("iteration-"):
        try:
            return int(name.split("-", 1)[1])
        except ValueError:
            pass
    return 1


def _discover_evals(iteration_dir: Path) -> List[int]:
    """Discover eval-N directories and return sorted eval IDs."""
    eval_ids: List[int] = []
    if not iteration_dir.is_dir():
        return eval_ids
    for entry in iteration_dir.iterdir():
        if entry.is_dir() and entry.name.startswith("eval-"):
            try:
                eval_id = int(entry.name.split("-", 1)[1])
                eval_ids.append(eval_id)
            except ValueError:
                continue
    return sorted(eval_ids)


def _collect_eval_result(
    eval_dir: Path, eval_id: int
) -> Optional[Dict[str, Any]]:
    """Collect with_skill vs baseline results for a single eval."""
    with_skill_dir = eval_dir / "with_skill"
    without_skill_dir = eval_dir / "without_skill"

    ws_grading = _load_json(with_skill_dir / "grading.json")
    ws_timing = _load_json(with_skill_dir / "timing.json")
    bl_grading = _load_json(without_skill_dir / "grading.json")
    bl_timing = _load_json(without_skill_dir / "timing.json")

    if ws_grading is None or ws_timing is None:
        print(
            f"[WARN] Incomplete with_skill data for eval-{eval_id}, skipping.",
            file=sys.stderr,
        )
        return None

    if bl_grading is None or bl_timing is None:
        print(
            f"[WARN] Incomplete baseline data for eval-{eval_id}, skipping.",
            file=sys.stderr,
        )
        return None

    return {
        "eval_id": eval_id,
        "with_skill": {
            "pass_rate": round(_pass_rate(ws_grading), 4),
            "tokens": ws_timing.get("total_tokens", 0),
            "duration": ws_timing.get("total_duration_seconds", 0.0),
        },
        "baseline": {
            "pass_rate": round(_pass_rate(bl_grading), 4),
            "tokens": bl_timing.get("total_tokens", 0),
            "duration": bl_timing.get("total_duration_seconds", 0.0),
        },
    }


def _build_summary(
    eval_results: List[Dict[str, Any]],
) -> Dict[str, Dict[str, float]]:
    """Build summary statistics from with_skill results."""
    pass_rates = [r["with_skill"]["pass_rate"] for r in eval_results]
    tokens = [float(r["with_skill"]["tokens"]) for r in eval_results]
    durations = [r["with_skill"]["duration"] for r in eval_results]

    return {
        "pass_rate": {
            "mean": round(_mean(pass_rates), 4),
            "stddev": round(_stddev(pass_rates), 4),
        },
        "tokens": {
            "mean": round(_mean(tokens), 2),
            "stddev": round(_stddev(tokens), 2),
        },
        "duration_seconds": {
            "mean": round(_mean(durations), 2),
            "stddev": round(_stddev(durations), 2),
        },
    }


def _generate_markdown(benchmark: Dict[str, Any]) -> str:
    """Generate a human-readable markdown report from benchmark data."""
    lines: List[str] = []
    skill = benchmark["skill_name"]
    iteration = benchmark["iteration"]
    summary = benchmark["summary"]

    lines.append(f"# Benchmark Report: {skill}")
    lines.append(f"\n**Iteration:** {iteration}")
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append("| Metric | Mean | Std Dev |")
    lines.append("|--------|------|---------|")
    lines.append(
        f"| Pass Rate | {summary['pass_rate']['mean']:.2%} "
        f"| {summary['pass_rate']['stddev']:.4f} |"
    )
    lines.append(
        f"| Tokens | {summary['tokens']['mean']:.0f} "
        f"| {summary['tokens']['stddev']:.0f} |"
    )
    lines.append(
        f"| Duration (s) | {summary['duration_seconds']['mean']:.2f} "
        f"| {summary['duration_seconds']['stddev']:.2f} |"
    )
    lines.append("")

    lines.append("## Eval Results")
    lines.append("")
    lines.append(
        "| Eval | With Skill (pass) | Baseline (pass) | "
        "With Skill (tokens) | Baseline (tokens) | "
        "With Skill (dur) | Baseline (dur) |"
    )
    lines.append(
        "|------|-------------------|-----------------|"
        "--------------------|-------------------|"
        "-----------------|----------------|"
    )

    for r in benchmark["eval_results"]:
        ws = r["with_skill"]
        bl = r["baseline"]
        lines.append(
            f"| eval-{r['eval_id']} "
            f"| {ws['pass_rate']:.2%} | {bl['pass_rate']:.2%} "
            f"| {ws['tokens']} | {bl['tokens']} "
            f"| {ws['duration']:.2f}s | {bl['duration']:.2f}s |"
        )

    lines.append("")
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    iteration_dir = Path(args.iteration_dir).resolve()

    if not iteration_dir.is_dir():
        print(f"[ERROR] Not a directory: {iteration_dir}", file=sys.stderr)
        return 1

    eval_ids = _discover_evals(iteration_dir)
    if not eval_ids:
        print(
            f"[ERROR] No eval-N directories found in {iteration_dir}",
            file=sys.stderr,
        )
        return 1

    eval_results: List[Dict[str, Any]] = []
    for eval_id in eval_ids:
        eval_dir = iteration_dir / f"eval-{eval_id}"
        result = _collect_eval_result(eval_dir, eval_id)
        if result is not None:
            eval_results.append(result)

    if not eval_results:
        print(
            "[ERROR] No complete eval results found. "
            "Check warnings above for details.",
            file=sys.stderr,
        )
        return 1

    iteration_number = _extract_iteration_number(iteration_dir)

    benchmark: Dict[str, Any] = {
        "skill_name": args.skill_name,
        "iteration": iteration_number,
        "summary": _build_summary(eval_results),
        "eval_results": eval_results,
    }

    # Write benchmark.json
    json_path = iteration_dir / "benchmark.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(benchmark, f, indent=2, ensure_ascii=False)
    print(f"[OK] Written: {json_path}")

    # Write benchmark.md
    md_path = iteration_dir / "benchmark.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(_generate_markdown(benchmark))
    print(f"[OK] Written: {md_path}")

    # Print summary
    s = benchmark["summary"]
    print(
        f"\n--- Iteration {iteration_number} Summary ---\n"
        f"  Evals collected: {len(eval_results)}\n"
        f"  Pass rate:  {s['pass_rate']['mean']:.2%} "
        f"(stddev {s['pass_rate']['stddev']:.4f})\n"
        f"  Tokens:     {s['tokens']['mean']:.0f} "
        f"(stddev {s['tokens']['stddev']:.0f})\n"
        f"  Duration:   {s['duration_seconds']['mean']:.2f}s "
        f"(stddev {s['duration_seconds']['stddev']:.2f}s)"
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
