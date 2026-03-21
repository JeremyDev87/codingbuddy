---
name: security-audit
description: Use when reviewing code for security vulnerabilities, before shipping features, or conducting security assessments. Covers OWASP Top 10, secrets exposure, authentication, and authorization flaws.
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

# Security Audit

## Overview

Security vulnerabilities are invisible until exploited. This skill provides a systematic approach to finding them before attackers do.

**Core principle:** ASSUME BREACH. Review every input, every output, every boundary.

**Iron Law:**
```
NO SECURITY REVIEW WITHOUT THREAT MODELING FIRST
```

## When to Use

- Before merging any authentication or authorization code
- Before shipping features that handle user data
- When adding third-party dependencies
- After environment variable / secrets changes
- Periodic security sweeps on production code
- Reviewing MCP server endpoints (especially SSE/HTTP transport)

## The Four Phases

### Phase 1: Threat Modeling

**Before reviewing any code:**

1. **Identify Assets** — What are we protecting? (user data, tokens, credentials, business logic)
2. **Identify Attack Surfaces** — HTTP endpoints, file uploads, environment vars, third-party integrations
3. **Identify Threat Actors** — External attackers, malicious insiders, compromised dependencies
4. **Map Data Flow** — Where does sensitive data enter, travel, and exit?

### Phase 2: OWASP Top 10 Checklist

Work through each category systematically:

#### A01: Broken Access Control
```
- [ ] Every endpoint checks authentication
- [ ] Authorization verified per-resource, not just per-route
- [ ] IDOR: Can user A access user B's data by changing ID?
- [ ] Admin routes protected from regular users
- [ ] CORS policy restricts allowed origins
```

#### A02: Cryptographic Failures
```
- [ ] No plaintext passwords stored
- [ ] Sensitive data encrypted at rest (PII, tokens, keys)
- [ ] TLS enforced for all connections
- [ ] Weak algorithms absent (MD5, SHA1 for passwords, DES)
- [ ] Secrets not in code, logs, or URLs
```

#### A03: Injection
```sql
-- ❌ SQL Injection vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`);

-- ✅ Parameterized
db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

```typescript
// ❌ Command Injection
exec(`ls ${userInput}`);

// ✅ Safe
execFile('ls', [userInput]);
```

```typescript
// ❌ XSS
element.innerHTML = userInput;

// ✅ Safe
element.textContent = userInput;
```

#### A04: Insecure Design
```
- [ ] Rate limiting on sensitive endpoints (login, password reset)
- [ ] Account lockout after failed attempts
- [ ] Password reset tokens expire (< 15 minutes)
- [ ] Sensitive operations require re-authentication
```

#### A05: Security Misconfiguration
```
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary features/endpoints disabled
- [ ] Security headers present (CSP, HSTS, X-Frame-Options)
- [ ] Error messages don't expose stack traces to users
```

#### A06: Vulnerable Components
```bash
# Check for known CVEs
npm audit
yarn audit

# Check for outdated packages with vulnerabilities
npx audit-ci --moderate
```

#### A07: Authentication Failures
```
- [ ] Session IDs invalidated on logout
- [ ] JWT secrets sufficiently random (>= 256 bits)
- [ ] JWT expiry set appropriately (access: minutes, refresh: days)
- [ ] Brute force protection on login
- [ ] Multi-factor authentication available for sensitive actions
```

#### A08: Software Integrity Failures
```
- [ ] Dependencies pinned to exact versions
- [ ] Subresource integrity (SRI) for CDN assets
- [ ] CI/CD pipeline secured (no untrusted code execution)
- [ ] Package signatures verified where possible
```

#### A09: Logging Failures
```
- [ ] Authentication events logged (success + failure)
- [ ] Authorization failures logged
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] Log tampering prevented
- [ ] Alerts set for suspicious patterns
```

#### A10: Server-Side Request Forgery (SSRF)
```
- [ ] User-supplied URLs validated against allowlist
- [ ] Internal network addresses blocked from user input
- [ ] DNS rebinding protection
```

### Phase 3: Secrets & Credentials Scan

```bash
# Scan for hardcoded secrets
grep -rn "password\|secret\|token\|api_key\|apikey\|private_key" \
  --include="*.ts" --include="*.js" --include="*.env*" \
  --exclude-dir=node_modules .

# Check .gitignore covers sensitive files
cat .gitignore | grep -E "\.env|\.key|credentials"

# Verify no secrets in git history
git log --all --full-history -- "*.env" "*.key" "credentials*"
```

**Common secret patterns to find:**
```
❌ const API_KEY = "sk-abc123..."
❌ password: "admin123"
❌ Authorization: "Bearer eyJ..."  (hardcoded)
❌ connectionString = "mongodb://user:pass@host"

✅ const API_KEY = process.env.API_KEY
✅ password: process.env.DB_PASSWORD
```

### Phase 4: MCP Server Specific (codingbuddy)

For MCP servers using SSE/HTTP transport:

```typescript
// ❌ No authentication
app.use('/sse', sseHandler);

// ✅ Bearer token validation
app.use('/sse', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (process.env.MCP_SSE_TOKEN && token !== process.env.MCP_SSE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

```
- [ ] SSE endpoint authenticates when MCP_SSE_TOKEN is set
- [ ] CORS configured for trusted origins only
- [ ] Rate limiting on MCP tool calls
- [ ] Input validation on all tool parameters
- [ ] No sensitive data in MCP resource URIs
```

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "We're not a target" | Every internet-facing system is a target |
| "This is internal only" | Insider threats are real; internal ≠ trusted |
| "The framework handles it" | Frameworks have defaults that must be configured |
| "We'll add security later" | Retrofitting security costs 10× more |
| "Tests don't cover security" | Security requires dedicated review, not just tests |

## Quick Reference

| Category | Check | Tool |
|----------|-------|------|
| Dependencies | CVE scan | `npm audit` |
| Secrets | Hardcoded creds | grep + git-secrets |
| Injection | SQL, XSS, Command | Manual + ESLint |
| Auth | JWT, sessions | Manual review |
| Headers | CSP, HSTS | securityheaders.com |
| OWASP | Top 10 | ZAP, Burp Suite |

## Output Format

Document findings as:

```markdown
## Security Audit Report — YYYY-MM-DD

### Critical (fix before deploy)
- [ ] SQL injection in /api/users endpoint (line 42, users.service.ts)

### High (fix within 24h)
- [ ] JWT secret too short (< 256 bits)

### Medium (fix this sprint)
- [ ] Missing rate limiting on /auth/login

### Low (backlog)
- [ ] Verbose error messages in development mode

### Passed Checks
- [x] No hardcoded secrets found
- [x] All endpoints require authentication
```
