#!/usr/bin/env python3
"""Generate an HTML review page for skill-creator benchmark results.

Reads iteration workspace directories containing with_skill/ and baseline/
results, then produces a self-contained dark-mode HTML report with side-by-side
comparison, assertion pass/fail coloring, and feedback collection.

Usage:
    python generate_review.py <workspace>/iteration-N --skill-name <name> \
        [--previous-workspace <path>] [--static <output.html>]

Requirements: Python 3.8+, standard library only.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


def load_json(path: Path) -> Any:
    """Load a JSON file, returning None on failure."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def discover_results(iteration_dir: Path) -> Dict[str, Any]:
    """Discover with_skill and baseline result files in an iteration directory."""
    results: Dict[str, Any] = {"with_skill": [], "baseline": []}

    for variant in ("with_skill", "baseline"):
        variant_dir = iteration_dir / variant
        if not variant_dir.is_dir():
            continue
        for json_file in sorted(variant_dir.glob("*.json")):
            data = load_json(json_file)
            if data is None:
                continue
            # Handle both list-of-scenarios and single-scenario dict
            if isinstance(data, list):
                results[variant].extend(data)
            elif isinstance(data, dict):
                results[variant].append(data)

    return results


def count_assertions(scenarios: List[Dict]) -> Dict[str, int]:
    """Count pass/fail/total assertions across scenarios."""
    counts = {"pass": 0, "fail": 0, "total": 0}
    for scenario in scenarios:
        for assertion in scenario.get("assertions", []):
            counts["total"] += 1
            if assertion.get("passed", False):
                counts["pass"] += 1
            else:
                counts["fail"] += 1
    return counts


def build_scenario_rows(scenarios: List[Dict]) -> str:
    """Build HTML table rows for scenario assertions."""
    if not scenarios:
        return '<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">No scenarios found</td></tr>'

    rows = []
    for scenario in scenarios:
        name = html.escape(scenario.get("name", scenario.get("query", "Unknown")))
        assertions = scenario.get("assertions", [])
        if not assertions:
            rows.append(
                f'<tr><td>{name}</td>'
                '<td colspan="3" style="color:var(--text-dim)">No assertions</td></tr>'
            )
            continue

        for i, assertion in enumerate(assertions):
            label = html.escape(assertion.get("description", assertion.get("name", f"assertion-{i}")))
            passed = assertion.get("passed", False)
            status_cls = "pass" if passed else "fail"
            status_text = "PASS" if passed else "FAIL"
            detail = html.escape(assertion.get("detail", assertion.get("message", "")))
            scenario_cell = f"<td rowspan=\"{len(assertions)}\">{name}</td>" if i == 0 else ""
            rows.append(
                f'<tr>{scenario_cell}'
                f'<td>{label}</td>'
                f'<td class="status-{status_cls}">{status_text}</td>'
                f'<td class="detail">{detail}</td></tr>'
            )

    return "\n".join(rows)


def build_comparison_section(
    with_skill: List[Dict], baseline: List[Dict]
) -> str:
    """Build side-by-side comparison HTML for with_skill vs baseline."""
    ws_counts = count_assertions(with_skill)
    bl_counts = count_assertions(baseline)

    return f"""
    <div class="comparison">
      <div class="comp-panel">
        <h3>With Skill</h3>
        <div class="comp-stats">
          <span class="stat-pass">{ws_counts['pass']} pass</span>
          <span class="stat-fail">{ws_counts['fail']} fail</span>
          <span class="stat-total">{ws_counts['total']} total</span>
        </div>
        <table class="result-table">
          <thead><tr><th>Scenario</th><th>Assertion</th><th>Result</th><th>Detail</th></tr></thead>
          <tbody>{build_scenario_rows(with_skill)}</tbody>
        </table>
      </div>
      <div class="comp-panel">
        <h3>Baseline</h3>
        <div class="comp-stats">
          <span class="stat-pass">{bl_counts['pass']} pass</span>
          <span class="stat-fail">{bl_counts['fail']} fail</span>
          <span class="stat-total">{bl_counts['total']} total</span>
        </div>
        <table class="result-table">
          <thead><tr><th>Scenario</th><th>Assertion</th><th>Result</th><th>Detail</th></tr></thead>
          <tbody>{build_scenario_rows(baseline)}</tbody>
        </table>
      </div>
    </div>"""


def build_previous_comparison(
    current_dir: Path, previous_dir: Path
) -> str:
    """Build a delta section comparing current vs previous iteration."""
    curr = discover_results(current_dir)
    prev = discover_results(previous_dir)

    curr_ws = count_assertions(curr["with_skill"])
    prev_ws = count_assertions(prev["with_skill"])

    pass_delta = curr_ws["pass"] - prev_ws["pass"]
    fail_delta = curr_ws["fail"] - prev_ws["fail"]

    pass_sign = "+" if pass_delta >= 0 else ""
    fail_sign = "+" if fail_delta >= 0 else ""
    pass_cls = "delta-positive" if pass_delta >= 0 else "delta-negative"
    fail_cls = "delta-negative" if fail_delta >= 0 else "delta-positive"

    return f"""
    <div class="delta-section">
      <h2>Delta vs Previous Iteration</h2>
      <div class="delta-stats">
        <div class="delta-card">
          <div class="delta-label">Pass</div>
          <div class="delta-value {pass_cls}">{pass_sign}{pass_delta}</div>
          <div class="delta-detail">{prev_ws['pass']} &rarr; {curr_ws['pass']}</div>
        </div>
        <div class="delta-card">
          <div class="delta-label">Fail</div>
          <div class="delta-value {fail_cls}">{fail_sign}{fail_delta}</div>
          <div class="delta-detail">{prev_ws['fail']} &rarr; {curr_ws['fail']}</div>
        </div>
      </div>
    </div>"""


def generate_html(
    skill_name: str,
    iteration_dir: Path,
    previous_dir: Optional[Path] = None,
) -> str:
    """Generate the complete HTML review page."""
    results = discover_results(iteration_dir)
    iteration_name = iteration_dir.name

    comparison_html = build_comparison_section(
        results["with_skill"], results["baseline"]
    )

    delta_html = ""
    if previous_dir and previous_dir.is_dir():
        delta_html = build_previous_comparison(iteration_dir, previous_dir)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Benchmark Review — {html.escape(skill_name)}</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#e6edf3;--text-dim:#8b949e;
  --pass:#238636;--pass-bg:rgba(35,134,54,.15);
  --fail:#da3633;--fail-bg:rgba(218,54,51,.15);
  --accent:#58a6ff;--accent-hover:#79c0ff;
  --radius:8px;
  --font-mono:'SF Mono','Cascadia Code','Fira Code',monospace;
  --font-sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
}}
body{{background:var(--bg);color:var(--text);font-family:var(--font-sans);line-height:1.6;padding:2rem;max-width:1400px;margin:0 auto}}
h1{{font-size:1.6rem;font-weight:700;margin-bottom:.25rem}}
h2{{font-size:1.2rem;font-weight:600;margin:2rem 0 1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}}
h3{{font-size:1rem;font-weight:600;margin-bottom:.75rem}}
.subtitle{{color:var(--text-dim);margin-bottom:1.5rem;font-size:.9rem}}

.comparison{{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem}}
@media(max-width:900px){{.comparison{{grid-template-columns:1fr}}}}
.comp-panel{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem}}
.comp-stats{{display:flex;gap:1rem;margin-bottom:1rem;font-family:var(--font-mono);font-size:.85rem}}
.stat-pass{{color:var(--pass)}}
.stat-fail{{color:var(--fail)}}
.stat-total{{color:var(--text-dim)}}

.result-table{{width:100%;border-collapse:collapse;font-size:.85rem}}
.result-table th{{text-align:left;padding:.5rem;border-bottom:2px solid var(--border);color:var(--text-dim);font-weight:600}}
.result-table td{{padding:.5rem;border-bottom:1px solid var(--border);vertical-align:top}}
.result-table tr:last-child td{{border-bottom:none}}
.status-pass{{color:var(--pass);font-weight:700;font-family:var(--font-mono)}}
.status-fail{{color:var(--fail);font-weight:700;font-family:var(--font-mono)}}
.detail{{color:var(--text-dim);font-size:.8rem}}

.delta-section{{margin-bottom:2rem}}
.delta-stats{{display:flex;gap:1rem}}
.delta-card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.5rem;min-width:140px}}
.delta-label{{font-size:.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em}}
.delta-value{{font-size:1.6rem;font-weight:700;font-family:var(--font-mono)}}
.delta-detail{{font-size:.8rem;color:var(--text-dim);margin-top:.25rem}}
.delta-positive{{color:var(--pass)}}
.delta-negative{{color:var(--fail)}}

.feedback-section{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-top:2rem}}
.feedback-section h2{{margin-top:0;border-bottom:none;padding-bottom:0}}
.feedback-section textarea{{width:100%;min-height:120px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.75rem;font-family:var(--font-sans);font-size:.9rem;resize:vertical;margin:1rem 0}}
.btn{{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.5rem 1.25rem;cursor:pointer;font-size:.85rem;font-family:var(--font-sans);transition:border-color .15s,background .15s}}
.btn:hover{{border-color:var(--accent);background:#1c2129}}
.btn-primary{{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600}}
.btn-primary:hover{{background:var(--accent-hover)}}
.btn-group{{display:flex;gap:.5rem}}
</style>
</head>
<body>

<h1>Benchmark Review — {html.escape(skill_name)}</h1>
<p class="subtitle">Iteration: {html.escape(iteration_name)} | Generated from: {html.escape(str(iteration_dir))}</p>

{delta_html}

<h2>Side-by-Side Comparison</h2>
{comparison_html}

<div class="feedback-section">
  <h2>Feedback</h2>
  <p style="color:var(--text-dim);font-size:.85rem">Add notes about this iteration's results. Download as JSON for the next improvement cycle.</p>
  <textarea id="feedbackText" placeholder="What worked well? What needs improvement? Which assertions need attention?"></textarea>
  <div class="btn-group">
    <button class="btn btn-primary" onclick="downloadFeedback()">Download Feedback JSON</button>
  </div>
</div>

<script>
(function(){{
  "use strict";
  window.downloadFeedback = function(){{
    var feedback = {{
      skill_name: {json.dumps(skill_name)},
      iteration: {json.dumps(iteration_name)},
      timestamp: new Date().toISOString(),
      feedback: document.getElementById("feedbackText").value,
      results_summary: {{
        with_skill: {json.dumps(count_assertions(results["with_skill"]))},
        baseline: {json.dumps(count_assertions(results["baseline"]))}
      }}
    }};
    var blob = new Blob([JSON.stringify(feedback, null, 2)], {{type:"application/json"}});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "feedback-" + {json.dumps(iteration_name)} + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }};
}})();
</script>
</body>
</html>"""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate HTML review for skill-creator benchmark results."
    )
    parser.add_argument(
        "iteration_dir",
        type=Path,
        help="Path to iteration directory (e.g. workspace/iteration-1)",
    )
    parser.add_argument(
        "--skill-name",
        required=True,
        help="Name of the skill being benchmarked",
    )
    parser.add_argument(
        "--previous-workspace",
        type=Path,
        default=None,
        help="Path to previous iteration directory for delta comparison",
    )
    parser.add_argument(
        "--static",
        type=Path,
        default=None,
        help="Output path for static HTML file (default: stdout)",
    )

    args = parser.parse_args()

    if not args.iteration_dir.is_dir():
        print(f"Error: {args.iteration_dir} is not a directory", file=sys.stderr)
        return 1

    html_content = generate_html(
        skill_name=args.skill_name,
        iteration_dir=args.iteration_dir,
        previous_dir=args.previous_workspace,
    )

    if args.static:
        args.static.parent.mkdir(parents=True, exist_ok=True)
        with open(args.static, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Written to {args.static}", file=sys.stderr)
    else:
        print(html_content)

    return 0


if __name__ == "__main__":
    sys.exit(main())
