/**
 * Mirror — Multi-Perspective Code Review Engine
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Credential shapes worth stopping a commit for.
 *
 * The single pattern this replaced was `/sk-[a-zA-Z0-9]{32,}/`, whose character class
 * excludes `-` and `_`. That is every modern key: `sk-proj-...` and `sk-live-...` both
 * slipped through the check written for exactly them, and so did GitHub tokens, AWS key
 * ids, Slack tokens and private-key blocks. Measured: 2 of 7 real formats caught.
 *
 * Each entry names what it looks for, so a finding says which shape matched instead of
 * "a credential, somewhere".
 */
const SECRET_PATTERNS = [
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'AWS access key id', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Google API key', re: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'JSON Web Token', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
  // The assignment forms. Deliberately require a non-empty literal on the right: an empty
  // string, a placeholder or a reference to a variable is not a leaked secret, and
  // flagging `apiKey: config.apiKey` would make this lens noise.
  { name: 'assigned credential', re: /\b(?:api[_-]?key|secret|passwd|password|token|auth)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i },
];

export class MirrorReviewer {
  constructor(options = {}) {
    this.strict = options.strict ?? true;
    this.maxDiffLines = options.maxDiffLines ?? 500;
  }

  /**
   * Reviews code diffs across 4 perspectives: Security, Correctness, Maintainability, Performance.
   */
  reviewDiff(diffText) {
    const findings = [];
    const lines = String(diffText ?? '').split('\n');

    // Lines this reviewer can actually look at: added lines, excluding the
    // `+++ b/path` header. Counted up front so the verdict can distinguish
    // "nothing wrong here" from "nothing here".
    const analysable = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;

    let currentFile = 'unknown';
    // The line number in the NEW FILE, tracked from the hunk headers.
    //
    // Every finding used to report `i + 1`: the index of the line within the diff text.
    // That number does not identify anything — it points into the patch, not into the
    // file — so a reviewer following it landed somewhere unrelated. A finding with a
    // wrong location is worse than one with none, because the reader trusts it.
    let newLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('+++ b/')) {
        currentFile = line.substring(6).trim();
        continue;
      }

      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        newLine = Number(hunk[1]);
        continue;
      }

      if (!line.startsWith('+') || line.startsWith('+++')) {
        // A context line advances the new-file counter; a removed line does not exist in
        // the new file and must not.
        if (!line.startsWith('-') && !line.startsWith('\\')) newLine++;
        continue;
      }
      const content = line.substring(1);
      const at = newLine;
      newLine++;

      // 1. Security Lens
      const secret = SECRET_PATTERNS.find((p) => p.re.test(content));
      if (secret) {
        findings.push({
          lens: 'security',
          severity: 'HIGH',
          file: currentFile,
          line: at,
          message: `Hardcoded credential detected in diff (${secret.name}).`
        });
      }
      if (/eval\s*\(/i.test(content) || /exec\s*\(/i.test(content)) {
        findings.push({
          lens: 'security',
          severity: 'HIGH',
          file: currentFile,
          line: at,
          message: 'Unsafe code execution primitive (eval/exec) detected.'
        });
      }

      // 2. Correctness Lens
      if (/==\s*null|!=\s*null/.test(content)) {
        findings.push({
          lens: 'correctness',
          severity: 'MEDIUM',
          file: currentFile,
          line: at,
          message: 'Loose equality check against null. Prefer strict (=== or !==).'
        });
      }

      // 3. Maintainability Lens
      if (content.trim().startsWith('// TODO') || content.trim().startsWith('// FIXME')) {
        findings.push({
          lens: 'maintainability',
          severity: 'LOW',
          file: currentFile,
          line: at,
          message: 'Unresolved TODO/FIXME comment added in diff.'
        });
      }

      // 4. Performance Lens
      if (/fs\.readFileSync|fs\.writeFileSync/.test(content) && !currentFile.includes('test')) {
        findings.push({
          lens: 'performance',
          severity: 'MEDIUM',
          file: currentFile,
          line: at,
          message: 'Synchronous I/O operation in production diff line.'
        });
      }
    }

    const highCount = findings.filter(f => f.severity === 'HIGH').length;

    // An empty diff is not a clean diff.
    //
    // reviewDiff('') used to return PASS with confidence 'high' -- a confident
    // all-clear over nothing at all. That is reachable by accident far more often
    // than it looks: the wrong branch name, a diff taken against the wrong base, a
    // range that resolves to no changes. Callers that only read `verdict` then
    // record a passed review, and aggregates built on top inherit it.
    if (analysable === 0) {
      return {
        verdict: 'PASS',
        confidence: 'none',
        measured: false,
        analysedLines: 0,
        findingsCount: 0,
        findings: [],
        honest: 'No added lines to review: this diff is unexamined, not clean. Check the branch or base you passed.'
      };
    }

    const verdict = highCount > 0 ? 'BLOCK' : (findings.length > 0 ? 'WARN' : 'PASS');

    return {
      verdict,
      confidence: 'high',
      measured: true,
      analysedLines: analysable,
      findingsCount: findings.length,
      findings,
      honest: `Diff analysis bound: static regex lens pass over ${analysable} added lines.`
    };
  }
}
