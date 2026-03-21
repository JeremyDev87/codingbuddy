# Wave Analysis Guide

Detailed algorithms for dependency analysis, file overlap detection, and wave division.
Used in Phase 2 of the `/parallel-issues` skill.

---

## 1. Dependency Graph Extraction

### Input
Issue bodies (markdown text) for all target issues.

### Dependency Patterns

Scan each issue body for these regex patterns:

```
Pattern                          | Direction
---------------------------------|----------
depends on #(\d+)               | current depends on matched
after #(\d+)                    | current depends on matched
blocked by #(\d+)               | current depends on matched
requires #(\d+)                 | current depends on matched
Parent: #(\d+)                  | current is child of matched
precedes #(\d+)                 | matched depends on current
before #(\d+)                   | matched depends on current
```

Case-insensitive matching. Apply to full issue body text.

### Building the Graph

```python
# Pseudocode
dependency_graph = {}  # issue_num -> set of issues it depends on

for issue in issues:
    deps = set()
    for pattern in DEPENDENCY_PATTERNS:
        matches = regex_findall(pattern, issue.body)
        deps.update(matches)
    # Only include dependencies that are in our issue set
    dependency_graph[issue.number] = deps & set(all_issue_numbers)
```

### Cycle Detection

Before proceeding, check for dependency cycles:

```python
def detect_cycle(graph):
    visited = set()
    rec_stack = set()

    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
        rec_stack.remove(node)
        return False

    for node in graph:
        if node not in visited:
            if dfs(node):
                return True  # Cycle found!
    return False
```

If a cycle is detected, **STOP** and report the cycle to the user. Do not attempt to break it automatically.

---

## 2. File Path Extraction

### Input
Issue body (markdown text) for a single issue.

### Extraction Algorithm

```python
import re

FILE_PATH_PATTERN = re.compile(
    r'(?<![/\w])'                          # not preceded by / or word char
    r'(?:'
    r'(?:packages|src|apps'                # known root directories
    r'|\.claude|\.cursor|\.kiro'           # tool config directories
    r'|\.q|\.antigravity|\.codex)'
    r'/[\w./@-]+\.\w+'                     # path with extension
    r')',
    re.MULTILINE
)

URL_PATTERN = re.compile(r'https?://')

def extract_file_paths(body: str) -> list[str]:
    # Find all matches
    matches = FILE_PATH_PATTERN.findall(body)

    # Filter out URLs
    result = []
    for match in matches:
        # Check if this match is part of a URL
        idx = body.find(match)
        prefix = body[max(0, idx-10):idx]
        if URL_PATTERN.search(prefix):
            continue

        # Clean trailing punctuation
        cleaned = match.rstrip('.,;:)}]"\'')
        result.append(cleaned)

    # Deduplicate and sort
    return sorted(set(result))
```

### Recognized Path Prefixes

| Prefix | Example |
|--------|---------|
| `packages/` | `packages/rules/.ai-rules/agents/foo.json` |
| `src/` | `src/mcp/handlers/tool.handler.ts` |
| `apps/` | `apps/mcp-server/src/main.ts` |
| `.claude/` | `.claude/skills/taskmaestro/SKILL.md` |
| `.cursor/` | `.cursor/rules/custom.md` |
| `.kiro/` | `.kiro/agents/architect.md` |
| `.q/` | `.q/settings.json` |
| `.antigravity/` | `.antigravity/rules/core.md` |
| `.codex/` | `.codex/config.yaml` |

### Edge Cases

- **Code blocks:** Paths inside ` ``` ` blocks are valid (often the most precise file references)
- **Bullet lists:** `- packages/foo/bar.ts` — the dash prefix is not part of the path
- **Tables:** `| packages/foo/bar.ts |` — pipe characters are not part of the path
- **Korean text:** `대상 파일: packages/foo/bar.ts` — works with the regex
- **Glob patterns:** `packages/rules/.ai-rules/agents/*.json` — extract the directory, not the glob

---

## 3. File Overlap Matrix

### Input
File maps for all issues: `Map<issueNum, filePaths[]>`

### Algorithm

```python
def build_overlap_matrix(file_maps: dict) -> list[dict]:
    issues = sorted(file_maps.keys())
    overlaps = []

    for i in range(len(issues)):
        for j in range(i + 1, len(issues)):
            a, b = issues[i], issues[j]
            shared = set(file_maps[a]) & set(file_maps[b])
            if shared:
                overlaps.append({
                    'issueA': a,
                    'issueB': b,
                    'sharedFiles': sorted(shared),
                    'count': len(shared)
                })

    return overlaps
```

### Output Format

```
File Overlap Matrix (3 conflicts found):

  #733 <-> #734: 2 shared files
    - packages/rules/.ai-rules/agents/README.md
    - packages/rules/.ai-rules/agents/schema.json

  #734 <-> #736: 1 shared file
    - packages/rules/.ai-rules/rules/core.md

  #740 <-> #741: 1 shared file
    - .claude/skills/taskmaestro/SKILL.md

No overlaps: #732, #735, #737, #738, #739, #742, #743
```

---

## 4. Wave Splitting Algorithm

### Input
- Issue list with dependency constraints (from Step 1)
- File overlap matrix (from Step 3)

### Algorithm: Constrained Graph Coloring

```python
def split_into_waves(issues: list[int],
                     dependencies: dict,  # issue -> depends_on[]
                     overlaps: list[dict]) -> list[list[int]]:
    """
    Assign each issue to a wave such that:
    1. If A depends on B, wave(A) > wave(B)
    2. If A and B share files, wave(A) != wave(B)  [Iron Rule]
    """

    # Step 1: Compute minimum wave from dependencies (topological sort)
    min_wave = {}

    def compute_min_wave(issue):
        if issue in min_wave:
            return min_wave[issue]
        deps = dependencies.get(issue, set())
        if not deps:
            min_wave[issue] = 0
            return 0
        max_dep_wave = max(compute_min_wave(d) for d in deps)
        min_wave[issue] = max_dep_wave + 1
        return min_wave[issue]

    for issue in issues:
        compute_min_wave(issue)

    # Step 2: Build conflict graph from file overlaps
    conflicts = {}  # issue -> set of conflicting issues
    for overlap in overlaps:
        a, b = overlap['issueA'], overlap['issueB']
        conflicts.setdefault(a, set()).add(b)
        conflicts.setdefault(b, set()).add(a)

    # Step 3: Greedy assignment respecting both constraints
    wave_assignment = {}  # issue -> wave_number
    waves = []  # list of sets, waves[i] = set of issues in wave i

    # Process issues in topological order (by min_wave, then by issue number)
    sorted_issues = sorted(issues, key=lambda i: (min_wave.get(i, 0), i))

    for issue in sorted_issues:
        earliest = min_wave.get(issue, 0)

        # Find the first wave >= earliest where no conflicts exist
        assigned = False
        for w in range(earliest, len(waves) + 1):
            if w >= len(waves):
                waves.append(set())

            # Check: no conflicting issue in this wave
            wave_conflicts = conflicts.get(issue, set())
            if not (waves[w] & wave_conflicts):
                waves[w].add(issue)
                wave_assignment[issue] = w
                assigned = True
                break

        if not assigned:
            # Should never happen with unbounded waves
            waves.append({issue})
            wave_assignment[issue] = len(waves) - 1

    # Convert to list of lists
    return [sorted(wave) for wave in waves if wave]
```

### Properties

1. **Dependency-respecting:** If A depends on B, A is always in a later wave than B
2. **Conflict-free:** No two issues in the same wave share any files (Iron Rule)
3. **Greedy-optimal:** Minimizes wave count given the constraints
4. **Deterministic:** Same input always produces same output (sorted by issue number)

### Verification

After wave assignment, run the Zero-Conflict Check:

```python
def verify_zero_conflict(waves: list[list[int]],
                         file_maps: dict) -> bool:
    for wave in waves:
        for i in range(len(wave)):
            for j in range(i + 1, len(wave)):
                a, b = wave[i], wave[j]
                shared = set(file_maps.get(a, [])) & set(file_maps.get(b, []))
                if shared:
                    print(f"CONFLICT: #{a} and #{b} share: {shared}")
                    return False
    return True
```

If verification fails, **ABORT**. This indicates a bug in the algorithm.

---

## 5. Practical Example

### Input

Issues #732-#743 with these file mappings:

```
#732: [packages/rules/.ai-rules/rules/core.md]
#733: [packages/rules/.ai-rules/agents/*.json (35 files)]
#734: [packages/rules/.ai-rules/agents/*.json (35 files)]
#735: [packages/rules/.ai-rules/agents/README.md]
#736: [.claude/skills/taskmaestro/SKILL.md]
#737: [packages/rules/.ai-rules/rules/augmented-coding.md]
#738: [packages/rules/.ai-rules/adapters/claude-code.md]
#739: [packages/rules/.ai-rules/adapters/cursor.md]
#740: [.claude/skills/plan-to-issues/SKILL.md]
#741: [.claude/skills/retro/SKILL.md]
#742: [packages/rules/.ai-rules/rules/project.md]
#743: [.claude/CLAUDE.md]
```

### File Overlaps

```
#733 <-> #734: 35 shared files (all agent JSONs)
#733 <-> #735: 1 shared file (agents/README.md)
#734 <-> #735: 1 shared file (agents/README.md)
```

### Dependencies

```
None detected (all issues are independent sub-issues of #731)
```

### Wave Assignment

```
Wave 1: [#732, #733, #736, #737, #738, #739, #740, #741, #742, #743]
Wave 2: [#734, #735]
```

Explanation:
- #733 and #734 conflict (agent JSONs) → different waves
- #733 and #735 conflict (README.md) → different waves
- #734 and #735 conflict (README.md) → same wave is OK if #733 is elsewhere
  Wait — #734 and #735 share README.md → must be different waves!

Corrected:
```
Wave 1: [#732, #733, #736, #737, #738, #739, #740, #741, #742, #743]
Wave 2: [#734]
Wave 3: [#735]
```

Or with pane limit of 4:
```
Wave 1: [#732, #736, #737, #738]  (4 panes)
Wave 2: [#739, #740, #741, #742]  (4 panes)
Wave 3: [#733, #743]              (2 panes)
Wave 4: [#734]                    (1 pane)
Wave 5: [#735]                    (1 pane)
```

The pane limit adds an additional constraint that further splits waves.
