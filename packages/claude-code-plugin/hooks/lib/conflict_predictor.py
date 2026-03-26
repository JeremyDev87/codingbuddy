"""Conflict predictor — git history analysis for file collision warning.

Analyzes git log to predict which issues are likely to modify the same files,
enabling proactive conflict warnings during parallel execution planning.
"""
import re
import subprocess
from itertools import combinations
from typing import Dict, List, Tuple


class ConflictPredictor:
    """Predicts file conflicts between issues using git co-change history."""

    def __init__(self, repo_path: str = ".", max_commits: int = 200):
        """Initialize with repo path and commit depth."""
        self.repo_path = repo_path
        self.max_commits = max_commits

    def get_file_change_history(self) -> List[List[str]]:
        """Parse git log to build list of per-commit file lists.

        Returns:
            List of file lists, one per commit.
        """
        try:
            raw = subprocess.check_output(
                [
                    "git", "log",
                    f"--max-count={self.max_commits}",
                    "--name-only",
                    "--pretty=format:---COMMIT---",
                ],
                cwd=self.repo_path,
                timeout=10,
                text=True,
            )
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            return []

        if not raw.strip():
            return []

        commits: List[List[str]] = []
        for chunk in raw.split("---COMMIT---"):
            files = [f for f in chunk.strip().splitlines() if f.strip()]
            if files:
                commits.append(files)
        return commits

    def build_co_change_matrix(self) -> Dict[Tuple[str, str], int]:
        """Build file pair co-change frequency matrix.

        Keys are sorted tuples (file_a, file_b) where file_a < file_b.
        Values are the number of commits where both files appeared.
        """
        history = self.get_file_change_history()
        matrix: Dict[Tuple[str, str], int] = {}
        for files in history:
            for a, b in combinations(sorted(set(files)), 2):
                key = (a, b)
                matrix[key] = matrix.get(key, 0) + 1
        return matrix

    def extract_target_files(self, issue_body: str) -> List[str]:
        """Extract file paths from issue body text.

        Looks for patterns like: path/to/file.ext
        """
        pattern = r'(?:[\w.-]+/)+[\w.-]+\.\w+'
        matches = re.findall(pattern, issue_body)
        seen: set = set()
        result: List[str] = []
        for m in matches:
            if m not in seen:
                seen.add(m)
                result.append(m)
        return result

    def predict_conflicts(self, issues: List[Dict]) -> List[Dict]:
        """Predict conflicts between issue pairs.

        Args:
            issues: list of {number: int, body: str, files: list[str]}
        Returns:
            list of {issue_pair: (A, B), shared_files: [...], risk: "high"|"medium"|"low"}
        """
        matrix = self.build_co_change_matrix()

        # Resolve target files per issue: use provided files, fallback to body extraction
        issue_files: Dict[int, List[str]] = {}
        for issue in issues:
            files = issue.get("files", [])
            if not files:
                files = self.extract_target_files(issue.get("body", ""))
            issue_files[issue["number"]] = files

        results: List[Dict] = []
        issue_numbers = list(issue_files.keys())
        for i_num, j_num in combinations(issue_numbers, 2):
            i_files = set(issue_files[i_num])
            j_files = set(issue_files[j_num])
            shared = i_files & j_files

            if not shared:
                # Check co-change matrix for indirect conflicts
                co_changed_shared: set = set()
                for f_i in i_files:
                    for f_j in j_files:
                        key = tuple(sorted([f_i, f_j]))
                        if key in matrix and matrix[key] >= 2:
                            co_changed_shared.add(f_i)
                            co_changed_shared.add(f_j)
                if not co_changed_shared:
                    continue
                max_co = max(
                    matrix.get(tuple(sorted([f_i, f_j])), 0)
                    for f_i in i_files
                    for f_j in j_files
                )
                results.append({
                    "issue_pair": (i_num, j_num),
                    "shared_files": sorted(co_changed_shared),
                    "risk": self.get_risk_level(max_co),
                })
            else:
                # Direct file overlap — find max co-change score for risk
                max_co = 0
                for f in shared:
                    for key, count in matrix.items():
                        if f in key:
                            max_co = max(max_co, count)
                results.append({
                    "issue_pair": (i_num, j_num),
                    "shared_files": sorted(shared),
                    "risk": self.get_risk_level(max_co),
                })
        return results

    def get_risk_level(self, co_change_count: int) -> str:
        """Classify risk: high (>=5), medium (>=2), low (<2)."""
        if co_change_count >= 5:
            return "high"
        if co_change_count >= 2:
            return "medium"
        return "low"
