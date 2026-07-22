import fs from 'fs';
import path from 'path';

/**
 * Mirror Code Reviewer Core Engine
 */
export class MirrorReviewer {
  analyzeContent(code, filename = 'code.js') {
    const findings = {
      security: [],
      performance: [],
      readability: [],
      accessibility: []
    };

    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // 1. Security Checks
      if (/eval\(|exec\(|Function\(/.test(line)) {
        findings.security.push({ line: lineNum, message: 'Avoid eval/exec/Function constructor to prevent code injection.' });
      }
      if (/(api_key|password|secret_key|private_key)\s*=\s*['"][^'"]+['"]/i.test(line)) {
        findings.security.push({ line: lineNum, message: 'Potential hardcoded credential or secret detected.' });
      }
      if (/innerHTML\s*=/.test(line)) {
        findings.security.push({ line: lineNum, message: 'Direct innerHTML assignment can lead to XSS vulnerabilities.' });
      }

      // 2. Performance Checks
      if (/\.forEach\(.*\.forEach\(|\.map\(.*\.map\(/.test(line)) {
        findings.performance.push({ line: lineNum, message: 'Nested loop iteration detected (potential O(N^2) time complexity).' });
      }
      if (/setInterval\(|setTimeout\(/.test(line) && !/clearInterval|clearTimeout/.test(code)) {
        findings.performance.push({ line: lineNum, message: 'Timer initiated without apparent cleanup (potential memory leak).' });
      }

      // 3. Readability Checks
      if (line.length > 120) {
        findings.readability.push({ line: lineNum, message: `Line exceeds 120 characters (${line.length} chars). Consider splitting.` });
      }
      if (/var\s+/.test(line)) {
        findings.readability.push({ line: lineNum, message: 'Use `let` or `const` instead of legacy `var` keyword.' });
      }

      // 4. Accessibility Checks
      if (/<img\s+((?!alt=).)*$/i.test(line) && !/alt=/i.test(line)) {
        findings.accessibility.push({ line: lineNum, message: 'Image element missing `alt` attribute for screen readers.' });
      }
      if (/<button\s*>(\s*|<[^>]+>)*<\/button>/i.test(line)) {
        findings.accessibility.push({ line: lineNum, message: 'Button element appears to lack accessible text or label.' });
      }
    });

    const totalIssues = findings.security.length + findings.performance.length + findings.readability.length + findings.accessibility.length;
    let verdict = 'PASS';
    if (findings.security.length > 0) verdict = 'FAIL';
    else if (totalIssues > 0) verdict = 'WARN';

    return {
      filename,
      verdict,
      totalIssues,
      findings
    };
  }

  formatReport(result) {
    let out = `# 🪞 Mirror Code Review: ${result.filename}\n`;
    out += `**Verdict**: ${result.verdict === 'PASS' ? '✅ PASS' : result.verdict === 'WARN' ? '⚠️ WARN' : '❌ FAIL'}\n`;
    out += `**Total Issues**: ${result.totalIssues}\n\n`;

    for (const [category, items] of Object.entries(result.findings)) {
      out += `### ${category.toUpperCase()} (${items.length})\n`;
      if (items.length === 0) {
        out += `- No issues found.\n`;
      } else {
        items.forEach(item => {
          out += `- Line ${item.line}: ${item.message}\n`;
        });
      }
      out += `\n`;
    }
    return out;
  }
}

// CLI Handler
if (process.argv[1] && process.argv[1].endsWith('mirror.js')) {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const reviewer = new MirrorReviewer();

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = path.resolve(args[fileIndex + 1]);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      const res = reviewer.analyzeContent(code, path.basename(filePath));
      console.log(reviewer.formatReport(res));
    } else {
      console.error(`File not found: ${filePath}`);
    }
  } else {
    console.log('Usage: node mirror.js --file <path>');
  }
}
