import test from 'node:test';
import assert from 'node:assert/strict';
import { MirrorReviewer } from '../lib/mirror.js';

test('MirrorReviewer detects hardcoded secrets and loose equality', () => {
  const reviewer = new MirrorReviewer();
  const sampleDiff = `
+++ b/src/auth.js
+ const apiKey = "sk-abc123456789012345678901234567890";
+ if (user == null) return;
+ // TODO: add cleanup
`;

  const report = reviewer.reviewDiff(sampleDiff);
  assert.equal(report.verdict, 'BLOCK');
  assert.equal(report.findingsCount, 3);
  assert.equal(report.findings[0].lens, 'security');
});

// --- regression: an empty diff is not a clean diff --------------------------
//
// reviewDiff('') returned { verdict: 'PASS', confidence: 'high' } — a confident
// all-clear over nothing at all. Reachable by accident more often than it looks:
// the wrong branch name, a diff against the wrong base, a range resolving to no
// changes. Callers reading only `verdict` recorded a passed review of nothing.

test('an empty diff is reported as unexamined, not clean', () => {
  const r = new MirrorReviewer().reviewDiff('');
  assert.strictEqual(r.measured, false);
  assert.strictEqual(r.confidence, 'none');
  assert.strictEqual(r.analysedLines, 0);
  assert.match(r.honest, /unexamined/);
});

test('a diff with only headers counts as unexamined', () => {
  const r = new MirrorReviewer().reviewDiff('--- a/x.js\n+++ b/x.js\n@@ -1 +1 @@\n');
  assert.strictEqual(r.measured, false);
});

test('null and undefined do not throw', () => {
  assert.strictEqual(new MirrorReviewer().reviewDiff(null).measured, false);
  assert.strictEqual(new MirrorReviewer().reviewDiff(undefined).measured, false);
});

test('a real diff is still measured with high confidence', () => {
  const r = new MirrorReviewer().reviewDiff('--- a/x.js\n+++ b/x.js\n@@ -1 +1 @@\n-const a=1;\n+const a=2;\n');
  assert.strictEqual(r.measured, true);
  assert.strictEqual(r.confidence, 'high');
  assert.strictEqual(r.analysedLines, 1);
});
