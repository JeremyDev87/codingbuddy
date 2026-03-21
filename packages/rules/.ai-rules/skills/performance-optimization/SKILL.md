---
name: performance-optimization
description: Use when optimizing code performance, addressing slowness complaints, or measuring application speed improvements
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash
---

# Performance Optimization

**Iron Law:** `NO OPTIMIZATION WITHOUT PROFILING FIRST`

No exceptions - not for "obvious" bottlenecks, "quick wins", or "best practices".

**Use for:** Slow APIs, UI lag, high memory, slow builds, database queries, any "make it faster" request.

## Five Phases

| Phase | Activity | Output |
|-------|----------|--------|
| **1. Profile** | Find hot paths with profiler | Bottlenecks with % of time |
| **2. Benchmark** | 5 warm-up + 10 measured runs | Baseline with mean, std, p95 |
| **3. Prioritize** | Apply Amdahl's Law | ROI-ranked list |
| **4. Optimize** | ONE change, verify | Measured improvement |
| **5. Prevent** | CI gates, monitoring | Regression detection |

### Phase 1: Profile

1. Clarify metrics ("It's slow" → p50? p95?)
2. Select profiler:
   - **CPU:** perf, py-spy, node --prof, Chrome DevTools
   - **Memory:** heaptrack, memray, Chrome Memory
   - **I/O:** strace, iostat, slow query log
   - **Distributed:** OpenTelemetry, Jaeger, Datadog
   - **Serverless:** AWS X-Ray, CloudWatch
   - **Mobile:** Android Profiler, Xcode Instruments
3. Profile cold AND warm cache
4. **Flame graphs:** Wider bars = more time
5. **Time-box:** Max 2 hours → Escalate if unclear

### Phase 3: Prioritize (Amdahl's Law)

**Formula:** `Speedup = 1 / ((1 - P) + P/S)`

| Bottleneck % | Max Speedup | Action |
|--------------|-------------|--------|
| < 5% | < 1.05x | Skip |
| 5-20% | 1.05-1.25x | Low priority |
| 20-50% | 1.25-2x | Medium |
| > 50% | > 2x | **High priority** |

**Multiple similar %?** Optimize easiest first. Re-profile after each.

### Phase 4: Optimize

1. Write benchmark test first
2. ONE change at a time
3. Compare statistically
4. **Rollback:** Separate commit, feature flags

### Phase 5: Prevent

Add CI gate: `PERF_BUDGET_MS: 150` → fail build if exceeded

## Red Flags - STOP

- "I know where the bottleneck is" → Profile first
- "Let's just add caching" → Measure first
- "One run is enough" → High variance
- "The fix is obvious" → Return to Phase 1

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know the bottleneck" | Profiling surprises 90% of time |
| "Micro-optimizations add up" | Amdahl's Law: 5% code = 95% time |

See `documentation-template.md` for before/after template.
