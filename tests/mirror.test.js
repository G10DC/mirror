import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MirrorReviewer } from '../lib/mirror.js';

describe('MirrorReviewer', () => {
  it('detects security issues like eval and hardcoded secrets', () => {
    const reviewer = new MirrorReviewer();
    const code = `eval('console.log("bad")');\nconst api_key = "123456";`;
    const res = reviewer.analyzeContent(code, 'test.js');
    assert.strictEqual(res.verdict, 'FAIL');
    assert.strictEqual(res.findings.security.length, 2);
  });

  it('detects readability and accessibility issues', () => {
    const reviewer = new MirrorReviewer();
    const code = `var name = 'John';\n<img src="test.jpg">`;
    const res = reviewer.analyzeContent(code, 'test.html');
    assert.strictEqual(res.verdict, 'WARN');
    assert.strictEqual(res.findings.readability.length, 1);
    assert.strictEqual(res.findings.accessibility.length, 1);
  });

  it('passes clean code', () => {
    const reviewer = new MirrorReviewer();
    const code = `const greeting = 'Hello';\nconsole.log(greeting);`;
    const res = reviewer.analyzeContent(code, 'clean.js');
    assert.strictEqual(res.verdict, 'PASS');
    assert.strictEqual(res.totalIssues, 0);
  });
});
