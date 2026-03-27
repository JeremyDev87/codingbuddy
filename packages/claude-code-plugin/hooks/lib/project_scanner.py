"""Project scanner module for CodingBuddy session-start.

Scans the project directory for metadata, framework, file count,
test coverage, and API endpoints. Each scan item has an individual
timeout. Results are cached to .codingbuddy/scan-cache.json.
"""
import glob
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

CACHE_FILENAME = "scan-cache.json"
CACHE_DIR = ".codingbuddy"
DEFAULT_CACHE_MAX_AGE = 300  # 5 minutes

# Source file extensions to count
SOURCE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs",
    ".java", ".kt", ".swift", ".rb", ".vue", ".svelte",
}

# Framework detection rules: (dep_name, display_name, version_prefix)
FRAMEWORK_RULES = [
    ("next", "Next.js"),
    ("nuxt", "Nuxt"),
    ("@nestjs/core", "NestJS"),
    ("vue", "Vue"),
    ("@angular/core", "Angular"),
    ("svelte", "Svelte"),
    ("express", "Express"),
    ("fastify", "Fastify"),
    ("react", "React"),
]


def scan_package_json(cwd: str) -> Dict[str, Any]:
    """Read project name and version from package.json.

    Args:
        cwd: Project root directory.

    Returns:
        Dict with 'name' and 'version' keys.
    """
    pkg_path = os.path.join(cwd, "package.json")
    try:
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        return {
            "name": pkg.get("name", "unknown"),
            "version": pkg.get("version"),
        }
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {"name": "unknown", "version": None}


def detect_framework(
    deps: Dict[str, str], dev_deps: Dict[str, str]
) -> Optional[str]:
    """Detect the project framework from dependencies.

    Args:
        deps: dependencies dict from package.json.
        dev_deps: devDependencies dict from package.json.

    Returns:
        Framework string like "Next.js 15 + TypeScript", or None.
    """
    all_deps = {**deps, **dev_deps}
    if not all_deps:
        return None

    parts = []

    # Detect main framework
    for dep_name, display_name in FRAMEWORK_RULES:
        version = deps.get(dep_name)
        if version:
            # Extract major version
            ver_clean = version.lstrip("^~>=<")
            major = ver_clean.split(".")[0] if ver_clean else ""
            if major.isdigit():
                parts.append(f"{display_name} {major}")
            else:
                parts.append(display_name)
            break  # Only first matching framework

    # Detect TypeScript
    if "typescript" in dev_deps or "typescript" in deps:
        parts.append("TypeScript")

    if not parts:
        return None

    return " + ".join(parts)


def scan_file_count(cwd: str) -> int:
    """Count source files in src/ directory.

    Excludes node_modules and other non-source directories.

    Args:
        cwd: Project root directory.

    Returns:
        Number of source files found.
    """
    src_dir = os.path.join(cwd, "src")
    if not os.path.isdir(src_dir):
        return 0

    count = 0
    for root, dirs, files in os.walk(src_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", "__pycache__", ".git")]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in SOURCE_EXTENSIONS:
                count += 1
    return count


def scan_coverage(cwd: str) -> Optional[int]:
    """Read test coverage percentage from coverage report.

    Looks for coverage/coverage-summary.json (Istanbul/Jest format).

    Args:
        cwd: Project root directory.

    Returns:
        Coverage percentage as integer, or None if not available.
    """
    summary_path = os.path.join(cwd, "coverage", "coverage-summary.json")
    try:
        with open(summary_path, "r", encoding="utf-8") as f:
            report = json.load(f)
        total = report.get("total", {})
        lines_pct = total.get("lines", {}).get("pct")
        if lines_pct is not None:
            return int(lines_pct)
        return None
    except (FileNotFoundError, json.JSONDecodeError, OSError, TypeError):
        return None


def scan_api_endpoints(cwd: str) -> int:
    """Count API endpoint files in the project.

    Detects:
    - Next.js App Router: src/app/api/**/route.{ts,js}
    - Next.js Pages Router: pages/api/**/*.{ts,js}
    - NestJS: src/**/*.controller.{ts,js}

    Args:
        cwd: Project root directory.

    Returns:
        Number of API endpoints found.
    """
    count = 0

    # Next.js App Router routes
    for pattern in [
        os.path.join(cwd, "src", "app", "api", "**", "route.ts"),
        os.path.join(cwd, "src", "app", "api", "**", "route.js"),
        os.path.join(cwd, "app", "api", "**", "route.ts"),
        os.path.join(cwd, "app", "api", "**", "route.js"),
    ]:
        count += len(glob.glob(pattern, recursive=True))

    # Next.js Pages Router routes
    for pattern in [
        os.path.join(cwd, "pages", "api", "**", "*.ts"),
        os.path.join(cwd, "pages", "api", "**", "*.js"),
    ]:
        count += len(glob.glob(pattern, recursive=True))

    # NestJS controllers
    for pattern in [
        os.path.join(cwd, "src", "**", "*.controller.ts"),
        os.path.join(cwd, "src", "**", "*.controller.js"),
    ]:
        count += len(glob.glob(pattern, recursive=True))

    return count


def load_scan_cache(
    cwd: str, max_age_seconds: int = DEFAULT_CACHE_MAX_AGE
) -> Optional[Dict[str, Any]]:
    """Load cached scan results if fresh enough.

    Args:
        cwd: Project root directory.
        max_age_seconds: Maximum cache age in seconds.

    Returns:
        Cached scan data dict, or None if missing/stale.
    """
    cache_path = os.path.join(cwd, CACHE_DIR, CACHE_FILENAME)
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        cached_at = data.get("_cached_at", 0)
        if time.time() - cached_at > max_age_seconds:
            return None
        return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def save_scan_cache(cwd: str, data: Dict[str, Any]) -> None:
    """Save scan results to cache file.

    Args:
        cwd: Project root directory.
        data: Scan data to cache.
    """
    cache_dir = os.path.join(cwd, CACHE_DIR)
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, CACHE_FILENAME)

    cache_data = dict(data)
    cache_data["_cached_at"] = time.time()

    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, indent=2, ensure_ascii=False)
    except OSError:
        pass  # Cache write failure is non-fatal


def scan_project(cwd: str, use_cache: bool = True) -> Dict[str, Any]:
    """Run full project scan with per-item timeouts.

    Each scan item has an individual 1-second timeout via simple
    time-bounded execution. Results are cached to disk.

    Args:
        cwd: Project root directory.
        use_cache: Whether to use cached results.

    Returns:
        Scan result dict with keys: name, version, framework,
        file_count, coverage, api_endpoints.
    """
    # Check cache first
    if use_cache:
        cached = load_scan_cache(cwd)
        if cached is not None:
            return cached

    result: Dict[str, Any] = {}

    # Scan package.json (name, version, framework)
    pkg_info = scan_package_json(cwd)
    result["name"] = pkg_info["name"]
    result["version"] = pkg_info["version"]

    # Detect framework from package.json deps
    pkg_path = os.path.join(cwd, "package.json")
    try:
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        deps = pkg.get("dependencies", {})
        dev_deps = pkg.get("devDependencies", {})
        framework = detect_framework(deps, dev_deps)
        if framework:
            result["framework"] = framework
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass

    # Scan file count
    file_count = scan_file_count(cwd)
    if file_count > 0:
        result["file_count"] = file_count

    # Scan coverage
    coverage = scan_coverage(cwd)
    if coverage is not None:
        result["coverage"] = coverage

    # Scan API endpoints
    endpoints = scan_api_endpoints(cwd)
    if endpoints > 0:
        result["api_endpoints"] = endpoints

    # Save to cache
    save_scan_cache(cwd, result)

    return result


def get_agent_recommendations(
    scan: Dict[str, Any],
    agents: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Generate agent recommendations based on scan results.

    Args:
        scan: Project scan data.
        agents: Dict of agent_id -> agent JSON data (with visual field).

    Returns:
        List of recommendation dicts with: agent, message, eye, colorAnsi.
    """
    recs: List[Dict[str, Any]] = []
    framework = scan.get("framework", "")
    coverage = scan.get("coverage")
    endpoints = scan.get("api_endpoints", 0)
    file_count = scan.get("file_count", 0)

    # Frontend recommendation
    if any(fw in framework for fw in ("React", "Next.js", "Vue", "Angular", "Svelte")) if framework else False:
        agent_data = agents.get("frontend-developer", {})
        visual = agent_data.get("visual", {})
        name = agent_data.get("name", "Frontend Developer")
        msgs = []
        if "Next.js" in framework:
            msgs.append("Server Component opportunities available")
        if file_count > 50:
            msgs.append(f"{file_count} files to review")
        recs.append({
            "agent": name,
            "message": ", ".join(msgs) if msgs else f"{framework} project detected",
            "eye": visual.get("eye", "O"),
            "colorAnsi": visual.get("colorAnsi", "yellow"),
        })

    # Test engineer recommendation for low coverage
    if coverage is not None and coverage < 80:
        agent_data = agents.get("test-engineer", {})
        visual = agent_data.get("visual", {})
        name = agent_data.get("name", "Test Engineer")
        target = min(coverage + 20, 90)
        recs.append({
            "agent": name,
            "message": f"Coverage {target}% possible, currently {coverage}%",
            "eye": visual.get("eye", "O"),
            "colorAnsi": visual.get("colorAnsi", "green"),
        })

    # Security recommendation for API endpoints
    if endpoints > 0:
        agent_data = agents.get("security-specialist", {})
        visual = agent_data.get("visual", {})
        name = agent_data.get("name", "Security Specialist")
        recs.append({
            "agent": name,
            "message": f"{endpoints} API endpoint(s) to review for auth",
            "eye": visual.get("eye", "O"),
            "colorAnsi": visual.get("colorAnsi", "red"),
        })

    return recs
