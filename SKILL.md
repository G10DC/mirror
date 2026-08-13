---
name: mirror
status: implemented
description: >-
  Runs a pre-commit, multi-perspective code review -- security, correctness, and
  maintainability passes over the actual diff about to be committed. Use when
  reviewing staged changes before commit, catching injection risks, or getting a
  second-opinion pass on a pull request. Never use to audit dependency
  vulnerabilities -- use lookout instead; never use to probe a live target --
  use siege instead.
---

# mirror

A single-pass self-review misses what a second perspective catches. One rule above all:
**review the diff that will actually be committed, not the intent behind it.**

## Golden rules

1. **Scope is the staged diff text.** Mirror reviews only the `+` lines of a unified diff string
   — not the whole repo, not dependency trees, not running infrastructure.
2. **Four lenses, each a fixed regex check.** Security, correctness, maintainability, and
   performance run independently per added line; findings merge into one ranked verdict.
3. **Findings block, they don't just annotate.** Any `HIGH` finding forces `verdict: BLOCK`;
   lower-severity findings surface under `WARN` without blocking.

## Honest scope

Each "lens" is one or two regexes, not a semantic analyzer: **security** = an OpenAI-style
`sk-...` pattern, `api_key\s*[:=]`, and `eval(`/`exec(`; **correctness** = loose `== null`/`!= null`;
**maintainability** = `// TODO`/`// FIXME`; **performance** = sync `fs.readFileSync`/`writeFileSync`
outside tests. That's the whole rule set — no SQL injection, XSS, logic-bug, or broad secret
detection (AWS/GitHub tokens aren't matched). A clean pass means "these four patterns weren't
found," not "this diff is safe."

## When to use

- Reviewing staged changes for the specific patterns above; a fast, zero-dependency first pass
  before a human or a fuller tool reviews the diff.

## When NOT to use

- **Real vulnerability coverage beyond four regex checks** → pair with a real SAST tool.
- **A dependency's CVEs or license compliance** → use `lookout`; mirror reads code, not the tree.
- **Probing or exploiting a live target** → use `siege`; mirror is static and read-only.

## Usage (library, not a CLI)

```js
import { MirrorReviewer } from './lib/mirror.js';

const diffText = execSync('git diff --staged', { encoding: 'utf8' });
const result = new MirrorReviewer().reviewDiff(diffText);
// result.verdict: 'PASS' | 'WARN' | 'BLOCK'
// result.findings: [{ lens, severity, file, line, message }, ...]
```
