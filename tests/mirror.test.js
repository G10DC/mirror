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
