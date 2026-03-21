#!/usr/bin/env python3
"""Run a description optimization loop for skill trigger evaluation.

Loads trigger_eval.json, splits cases into 60/40 train/test sets,
and iterates to optimize the skill description for better trigger accuracy.

LLM calls are replaced with CLI guidance — the script logs scores and
prompts the user to manually refine the description between iterations.

Usage:
    python run_loop.py <trigger-eval-json> --skill-name <name> [--iterations N] [--seed S]

Example:
    python run_loop.py workspace/trigger_eval.json --skill-name tdd --iterations 5

Requirements:
    Python 3.8+ (standard library only)
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Description optimization loop for skill trigger evaluation. "
            "Splits trigger_eval.json into train/test sets and guides "
            "iterative description refinement."
        ),
        epilog=(
            "Example:\n"
            "  python run_loop.py workspace/trigger_eval.json "
            "--skill-name tdd --iterations 5\n\n"
            "The script will guide you through each iteration, prompting\n"
            "you to run `recommend_skills` manually and enter results."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "trigger_eval_json",
        type=str,
        help="Path to trigger_eval.json file",
    )
    parser.add_argument(
        "--skill-name",
        required=True,
        help="Target skill name in kebab-case",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=5,
        help="Number of optimization iterations (default: 5)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for train/test split (default: 42)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to write iteration logs (default: same as trigger_eval.json)",
    )
    return parser.parse_args(argv)


def _load_trigger_eval(path: Path) -> List[Dict[str, Any]]:
    """Load and validate trigger_eval.json."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(
            "trigger_eval.json must be a non-empty array of test cases"
        )

    for i, case in enumerate(data):
        if "query" not in case or "should_trigger" not in case:
            raise ValueError(
                f"Case {i} missing required fields: 'query' and 'should_trigger'"
            )

    return data


def _split_train_test(
    cases: List[Dict[str, Any]], seed: int
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Split cases into 60% train / 40% test with deterministic shuffle."""
    rng = random.Random(seed)
    shuffled = list(cases)
    rng.shuffle(shuffled)
    split_idx = max(1, int(len(shuffled) * 0.6))
    return shuffled[:split_idx], shuffled[split_idx:]


def _compute_metrics(
    results: List[Dict[str, Any]],
) -> Dict[str, float]:
    """Compute precision, recall, F1 from trigger results.

    Each result dict has:
        - should_trigger: bool (ground truth)
        - triggered: bool (actual result from user input)
    """
    tp = sum(1 for r in results if r["should_trigger"] and r["triggered"])
    fp = sum(1 for r in results if not r["should_trigger"] and r["triggered"])
    fn = sum(1 for r in results if r["should_trigger"] and not r["triggered"])
    tn = sum(
        1 for r in results if not r["should_trigger"] and not r["triggered"]
    )

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    accuracy = (tp + tn) / len(results) if results else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "accuracy": round(accuracy, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


def _prompt_user_results(
    cases: List[Dict[str, Any]], skill_name: str, label: str
) -> List[Dict[str, Any]]:
    """Prompt user to manually run recommend_skills and report results.

    Since LLM calls cannot be made from this script, we guide the user
    to evaluate each query and enter whether the skill was triggered.
    """
    print(f"\n{'=' * 60}")
    print(f"  Evaluating {label} set ({len(cases)} cases)")
    print(f"  Target skill: {skill_name}")
    print(f"{'=' * 60}")
    print()
    print("For each query below, run:")
    print(f"  recommend_skills(prompt=<query>)")
    print(f"and check if '{skill_name}' appears in the results.")
    print()

    results: List[Dict[str, Any]] = []
    for i, case in enumerate(cases):
        query = case["query"]
        expected = case["should_trigger"]
        print(f"  [{i + 1}/{len(cases)}] Query: {query}")
        print(f"           Expected: {'TRIGGER' if expected else 'NO TRIGGER'}")

        while True:
            response = input(
                "           Result? (y=triggered / n=not triggered / s=skip): "
            ).strip().lower()
            if response in ("y", "n", "s"):
                break
            print("           Invalid input. Enter y, n, or s.")

        if response == "s":
            print("           -> Skipped")
            continue

        triggered = response == "y"
        match = triggered == expected
        results.append(
            {
                "query": query,
                "should_trigger": expected,
                "triggered": triggered,
                "match": match,
            }
        )
        print(f"           -> {'MATCH' if match else 'MISMATCH'}")

    return results


def _print_metrics(metrics: Dict[str, float], label: str) -> None:
    """Pretty-print evaluation metrics."""
    print(f"\n--- {label} Metrics ---")
    print(f"  Precision: {metrics['precision']:.2%}")
    print(f"  Recall:    {metrics['recall']:.2%}")
    print(f"  F1 Score:  {metrics['f1']:.2%}")
    print(f"  Accuracy:  {metrics['accuracy']:.2%}")
    print(
        f"  (TP={metrics['tp']} FP={metrics['fp']} "
        f"FN={metrics['fn']} TN={metrics['tn']})"
    )


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    trigger_path = Path(args.trigger_eval_json).resolve()

    if not trigger_path.is_file():
        print(f"[ERROR] File not found: {trigger_path}", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir) if args.output_dir else trigger_path.parent
    output_dir = output_dir.resolve()

    try:
        cases = _load_trigger_eval(trigger_path)
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"[ERROR] Failed to load trigger_eval.json: {exc}", file=sys.stderr)
        return 1

    train_set, test_set = _split_train_test(cases, args.seed)
    print(f"Loaded {len(cases)} cases: {len(train_set)} train / {len(test_set)} test")
    print(f"Skill: {args.skill_name}")
    print(f"Iterations: {args.iterations}")
    print(f"Seed: {args.seed}")

    iteration_log: List[Dict[str, Any]] = []

    for iteration in range(1, args.iterations + 1):
        print(f"\n{'#' * 60}")
        print(f"  ITERATION {iteration}/{args.iterations}")
        print(f"{'#' * 60}")

        # Step 1: Evaluate on train set
        print("\n[Step 1] Evaluate current description on TRAIN set")
        train_results = _prompt_user_results(
            train_set, args.skill_name, f"Iteration {iteration} TRAIN"
        )
        train_metrics = _compute_metrics(train_results)
        _print_metrics(train_metrics, f"Iteration {iteration} TRAIN")

        # Step 2: Guide description refinement
        print(f"\n[Step 2] Refine the skill description")
        print("  Based on the train results above, update the skill's")
        print("  'description' field in SKILL.md frontmatter to improve")
        print("  trigger accuracy.")
        print()
        print("  Mismatched cases to focus on:")
        mismatches = [r for r in train_results if not r.get("match", True)]
        if mismatches:
            for m in mismatches:
                direction = "should trigger but didn't" if m["should_trigger"] else "triggered but shouldn't"
                print(f"    - \"{m['query']}\" ({direction})")
        else:
            print("    (none — perfect score on train set)")
        print()
        input("  Press Enter when description has been updated...")

        # Step 3: Evaluate on test set
        print("\n[Step 3] Evaluate updated description on TEST set")
        test_results = _prompt_user_results(
            test_set, args.skill_name, f"Iteration {iteration} TEST"
        )
        test_metrics = _compute_metrics(test_results)
        _print_metrics(test_metrics, f"Iteration {iteration} TEST")

        # Log iteration
        entry = {
            "iteration": iteration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "train": {
                "metrics": train_metrics,
                "total_cases": len(train_results),
            },
            "test": {
                "metrics": test_metrics,
                "total_cases": len(test_results),
            },
        }
        iteration_log.append(entry)

        # Check convergence
        if test_metrics["f1"] >= 1.0:
            print("\n[INFO] Perfect F1 on test set. Stopping early.")
            break

    # Write iteration log
    log_path = output_dir / f"optimization_log_{args.skill_name}.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "skill_name": args.skill_name,
                "seed": args.seed,
                "train_size": len(train_set),
                "test_size": len(test_set),
                "iterations": iteration_log,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    print(f"\n[OK] Optimization log written: {log_path}")

    # Final summary
    print(f"\n{'=' * 60}")
    print("  OPTIMIZATION SUMMARY")
    print(f"{'=' * 60}")
    print(f"\n  {'Iter':>4}  {'Train F1':>10}  {'Test F1':>10}  {'Test Acc':>10}")
    print(f"  {'----':>4}  {'--------':>10}  {'-------':>10}  {'--------':>10}")
    for entry in iteration_log:
        it = entry["iteration"]
        tf1 = entry["train"]["metrics"]["f1"]
        sf1 = entry["test"]["metrics"]["f1"]
        sacc = entry["test"]["metrics"]["accuracy"]
        print(f"  {it:>4}  {tf1:>10.2%}  {sf1:>10.2%}  {sacc:>10.2%}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
