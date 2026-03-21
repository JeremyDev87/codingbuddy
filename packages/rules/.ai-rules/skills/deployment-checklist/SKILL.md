---
name: deployment-checklist
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.
disable-model-invocation: true
---

# Deployment Checklist

## Overview

Deployments fail in predictable ways. This checklist prevents the most common causes.

**Core principle:** Never deploy what you haven't tested. Never deploy without a rollback plan.

**Iron Law:**
```
NO DEPLOY WITHOUT ROLLBACK PLAN
If you can't roll back in < 5 minutes, don't deploy.
```

## When to Use

- Before every production deployment
- Before staging deployments of critical features
- When deploying database migrations with code
- When changing environment configuration
- When deploying infrastructure changes

## Phase 1: Pre-Deploy Validation

### Code Readiness
```
- [ ] All tests passing (zero failures)
- [ ] Test coverage meets threshold (≥ 80% for new code)
- [ ] No TypeScript errors (tsc --noEmit passes)
- [ ] Linting passes (eslint/prettier)
- [ ] No TODO/FIXME in production code paths
- [ ] Security audit passed (npm audit --audit-level=high)
- [ ] PR reviewed and approved
- [ ] Branch up-to-date with main
```

### Build Verification
```bash
# Verify build succeeds from clean state
rm -rf dist/ node_modules/.cache
npm run build

# Verify the build output
ls dist/
node dist/main.js --version
```

### Environment Configuration
```
- [ ] All required env vars documented in .env.example
- [ ] Production env vars set in deployment system
- [ ] No secrets committed to git
- [ ] Config differences between environments documented
- [ ] Feature flags configured correctly
```

## Phase 2: Database Migration (if applicable)

```
- [ ] Migration files reviewed and approved
- [ ] Migration tested on staging with production data snapshot
- [ ] Rollback migration written and tested
- [ ] Migration is backward-compatible (expand-contract pattern)
- [ ] Estimated migration duration known
- [ ] Maintenance window scheduled if migration > 30s

Migration order: deploy migration → verify → deploy code
```

```bash
# Test migration on staging first
npm run migration:run --env=staging

# Verify migration applied correctly
npm run migration:status

# Verify rollback works
npm run migration:revert --dry-run
```

## Phase 3: Deployment Execution

### Staging First
```
1. Deploy to staging
2. Run smoke tests on staging
3. Verify critical paths work
4. Check error rates in monitoring
5. Get sign-off before promoting to production
```

### Production Deploy
```bash
# Tag the release
git tag v$(npm run version --silent)
git push origin --tags

# Deploy (method varies by platform)
# Heroku:    git push heroku main
# Railway:   railway deploy
# Docker:    docker push && kubectl apply
# PM2:       pm2 deploy ecosystem.config.js production

# Monitor during deploy
watch -n 5 'curl -s https://api.example.com/health | jq .status'
```

## Phase 4: Health Checks

### Immediate (within 2 minutes of deploy)
```bash
# Health endpoint
curl https://api.example.com/health
# Expected: { "status": "ok", "version": "1.2.3" }

# MCP server health
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node dist/main.js 2>/dev/null | jq '.result.tools | length'
# Expected: > 0

# Check for error spikes
# (in your monitoring tool: Datadog, CloudWatch, etc.)
```

### Extended (within 10 minutes)
```
- [ ] Error rate < baseline (< 0.1% for APIs)
- [ ] Response times < baseline (p95 < 500ms)
- [ ] Memory usage stable (not growing)
- [ ] No unexpected log errors
- [ ] Database connections healthy
- [ ] External integrations responding
```

## Phase 5: Rollback Plan

**Document before deploying:**

```markdown
## Rollback Plan for v1.2.3

**Trigger conditions:**
- Error rate > 1% for 5 minutes
- P95 latency > 2s for 5 minutes
- Any data corruption detected

**Rollback steps:**
1. git revert [commit] → push
   OR
   kubectl rollout undo deployment/mcp-server
   (estimated time: 2 minutes)

2. If database migration was run:
   npm run migration:revert (estimated time: 30 seconds)

3. Verify rollback:
   curl https://api.example.com/health

**Decision maker:** [Name/role]
**Rollback time limit:** 5 minutes from trigger detection
```

## Phase 6: Post-Deploy Monitoring

### First 30 minutes
```
- [ ] Monitor error rates every 5 minutes
- [ ] Check application logs for unexpected errors
- [ ] Verify key business metrics unchanged
- [ ] Test critical user paths manually
- [ ] Watch memory and CPU trends
```

### First 24 hours
```
- [ ] Review full day's error logs
- [ ] Check performance percentiles (p50, p95, p99)
- [ ] Verify no data anomalies
- [ ] Team on standby for issues
```

## Platform-Specific Checklists

### Docker / Kubernetes
```
- [ ] Image built and pushed to registry
- [ ] Deployment manifest updated with new image tag
- [ ] Resource limits set (CPU, memory)
- [ ] Liveness and readiness probes configured
- [ ] Rolling update strategy (not Recreate)
- [ ] kubectl rollout status deployment/name watched
```

### NestJS / Node.js
```
- [ ] NODE_ENV=production set
- [ ] PM2 cluster mode for multi-core usage
- [ ] Graceful shutdown handler (SIGTERM)
- [ ] Memory limits configured
- [ ] Log rotation configured
```

## Quick Reference

| Environment | Approach |
|-------------|----------|
| Development | Deploy freely, no checklist needed |
| Staging | Run pre-deploy + health check phases |
| Production | Full checklist, no exceptions |

| Severity | Rollback Trigger |
|----------|-----------------|
| P0 Critical | Immediate rollback |
| P1 High | Rollback if > 5 min to fix |
| P2 Medium | Fix forward or rollback (team decision) |
| P3 Low | Fix forward in next deploy |

## Red Flags — Do Not Deploy

```
❌ Tests failing
❌ Build failing
❌ npm audit shows HIGH or CRITICAL vulnerabilities
❌ No rollback plan documented
❌ Migration not tested on staging
❌ Team members unavailable for 2h post-deploy
❌ Deploying Friday after 3pm
```
