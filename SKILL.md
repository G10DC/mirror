---
name: mirror
description: Runs a pre-commit, multi-perspective code review — security, correctness, and maintainability passes over the actual diff about to be committed. Use for/when reviewing staged changes before commit, catching injection risks or unsafe patterns introduced in this diff, or getting a second-opinion pass on a pull request. Never use to audit third-party dependency vulnerabilities or licenses (use lookout instead); never use to actively probe or exploit a live target (use siege instead) — mirror only reads the diff, it never scans dependency trees or attacks running services.
---

# mirror

A single-pass self-review misses what a second perspective catches. One rule above all:
**review the diff that will actually be committed, not the intent behind it.**

## Golden rules

1. **Scope is the staged diff.** Mirror reviews what's about to be committed — not the whole
   repository, not dependency trees, not running infrastructure.
2. **Security review is one lens among several.** `lib/security.js` covers the injection/unsafe
   pattern pass, but correctness and maintainability get equal weight — a secure diff that's
   unmaintainable still fails review.
3. **Findings block, they don't just annotate.** A finding at commit-blocking severity halts the
   commit; lower-severity findings are surfaced but don't halt.
4. **Multi-perspective means genuinely different lenses, not repeated passes.** Each perspective
   (security, correctness, maintainability) evaluates independently before findings are merged.
5. **Never widen scope into dependency or infrastructure territory.** If a finding points at a
   vulnerable dependency or a live-service weakness, surface it and hand off — don't try to
   audit or exploit it from inside mirror.

## When to use

- Reviewing staged changes before commit for security, correctness, or maintainability issues.
- A second-opinion pass on a pull request diff.

## When NOT to use

- **The concern is a dependency's known CVEs or license compliance, not this diff's logic** →
  use `lookout`. Mirror reads code; lookout reads the dependency tree.
- **The goal is to actively probe or exploit a live target to validate a vulnerability** →
  use `siege`. Mirror is a static, read-only pass on a diff — it never touches running services.
