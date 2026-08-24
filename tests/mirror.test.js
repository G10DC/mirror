import test, { describe, it } from 'node:test';
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

// The security lens caught 2 of 7 real credential formats. The pattern it relied on,
// `/sk-[a-zA-Z0-9]{32,}/`, excludes `-` and `_` — which is every modern key, including
// the `sk-proj-` form the pattern was evidently written for.
describe('security lens: credential shapes', () => {
  const reviewer = new MirrorReviewer();
  const diffWith = (line) => ['+++ b/lib/x.mjs', '@@ -1,0 +1,1 @@', `+${line}`].join('\n');
  const secrets = async (line) =>
    (await reviewer.reviewDiff(diffWith(line))).findings.filter((f) => /credential/i.test(f.message));

  const LEAKS = [
    ['modern OpenAI project key', 'const k = "sk-proj-abc123DEF456ghi789JKL012mno345PQR678";'],
    ['prefixed live key', 'const k = "sk-live-ABCDEF1234567890ABCDEF1234567890ABCD";'],
    ['classic key', 'const k = "sk-ABCDEF1234567890abcdefghij1234567890";'],
    ['GitHub token', 'const k = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";'],
    ['AWS access key id', 'const k = "AKIAIOSFODNN7EXAMPLE";'],
    ['private key block', '-----BEGIN RSA PRIVATE KEY-----'],
    ['assigned credential', 'const password = "correct-horse-battery";'],
  ];

  for (const [name, line] of LEAKS) {
    it(`catches a ${name}`, async () => {
      assert.ok((await secrets(line)).length > 0, `missed: ${line}`);
    });
  }

  // A lens that flags every mention of a credential is noise, and noise gets switched off.
  const INNOCUOUS = [
    'const apiKey = config.apiKey;',
    'const token = process.env.TOKEN;',
    'const password = "";',
    '// see the docs about sk- prefixed keys',
    'const secret = null;',
  ];

  for (const line of INNOCUOUS) {
    it(`does not flag: ${line}`, async () => {
      assert.deepStrictEqual(await secrets(line), []);
    });
  }
});

// Every finding used to report the index of the line within the diff text. That number
// points into the patch, not into the file, so a reviewer following it landed somewhere
// unrelated — worse than no line number, because the reader trusts it.
describe('findings point into the file, not into the patch', () => {
  const reviewer = new MirrorReviewer();

  it('counts from the hunk header, skipping removed lines', async () => {
    const diff = [
      '+++ b/lib/x.mjs',
      '@@ -10,3 +10,7 @@',
      ' const existing = 1;',
      '-const removed = 2;',
      '+const key = "sk-proj-abc123DEF456ghi789JKL012mno345PQR678";',
      '+return eval(userInput);',
    ].join('\n');
    const { findings } = await reviewer.reviewDiff(diff);
    assert.strictEqual(findings[0].line, 11, 'the credential is on line 11 of the new file');
    assert.strictEqual(findings[1].line, 12, 'the eval is on line 12 of the new file');
  });

  it('restarts at each hunk', async () => {
    const diff = [
      '+++ b/lib/x.mjs',
      '@@ -1,1 +1,2 @@',
      '+return eval(a);',
      '@@ -50,1 +80,2 @@',
      '+return eval(b);',
    ].join('\n');
    const { findings } = await reviewer.reviewDiff(diff);
    assert.deepStrictEqual(findings.map((f) => f.line), [1, 80]);
  });
});
