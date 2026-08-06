/**
 * Mirror — Multi-Perspective Code Review Engine
 */
import fs from 'node:fs';
import path from 'node:path';

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
    const lines = diffText.split('\n');

    let currentFile = 'unknown';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('+++ b/')) {
        currentFile = line.substring(6).trim();
        continue;
      }

      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      const content = line.substring(1);

      // 1. Security Lens
      if (/sk-[a-zA-Z0-9]{32,}/.test(content) || /api[_-]?key\s*[:=]/i.test(content)) {
        findings.push({
          lens: 'security',
          severity: 'HIGH',
          file: currentFile,
          line: i + 1,
          message: 'Hardcoded API secret or credential detected in diff.'
        });
      }
      if (/eval\s*\(/i.test(content) || /exec\s*\(/i.test(content)) {
        findings.push({
          lens: 'security',
          severity: 'HIGH',
          file: currentFile,
          line: i + 1,
          message: 'Unsafe code execution primitive (eval/exec) detected.'
        });
      }

      // 2. Correctness Lens
      if (/==\s*null|!=\s*null/.test(content)) {
        findings.push({
          lens: 'correctness',
          severity: 'MEDIUM',
          file: currentFile,
          line: i + 1,
          message: 'Loose equality check against null. Prefer strict (=== or !==).'
        });
      }

      // 3. Maintainability Lens
      if (content.trim().startsWith('// TODO') || content.trim().startsWith('// FIXME')) {
        findings.push({
          lens: 'maintainability',
          severity: 'LOW',
          file: currentFile,
          line: i + 1,
          message: 'Unresolved TODO/FIXME comment added in diff.'
        });
      }

      // 4. Performance Lens
      if (/fs\.readFileSync|fs\.writeFileSync/.test(content) && !currentFile.includes('test')) {
        findings.push({
          lens: 'performance',
          severity: 'MEDIUM',
          file: currentFile,
          line: i + 1,
          message: 'Synchronous I/O operation in production diff line.'
        });
      }
    }

    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const verdict = highCount > 0 ? 'BLOCK' : (findings.length > 0 ? 'WARN' : 'PASS');

    return {
      verdict,
      confidence: 'high',
      findingsCount: findings.length,
      findings,
      honest: 'Diff analysis bound: static regex lens pass over staged lines.'
    };
  }
}
