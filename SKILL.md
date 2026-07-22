---
name: mirror
description: Multi-perspective pre-commit code reviewer. Analyzes staged or target code across 4 distinct lenses — Security, Performance, Readability, and Accessibility — emitting structured feedback and a PASS/WARN/FAIL score before code is committed.
---

# 🪞 Mirror

Automated Multi-Perspective Pre-Commit Code Reviewer. Mirror acts as a "second pair of eyes" before code is committed or merged, analyzing diffs or files through four distinct analytical lenses.

## 🎯 Four Review Lenses

1. **🔒 Security**: Scans for unescaped inputs, dangerous evaluations, hardcoded secrets, and unsafe dependencies.
2. **⚡ Performance**: Flags quadratic loop complexity ($O(N^2)$), un-cached heavy computations, memory leaks, and redundant I/O operations.
3. **📖 Readability**: Evaluates cyclomatic complexity, naming clarity, function length, and adherence to clean code principles.
4. **♿ Accessibility**: Checks for semantic HTML structure, missing ARIA attributes, image `alt` tags, and keyboard navigation support.

## 🚀 Execution Guide

Run from any project directory:
```bash
node C:/Users/GdC/.gemini/config/skills/mirror/lib/mirror.js --diff
```
Or target specific files:
```bash
node C:/Users/GdC/.gemini/config/skills/mirror/lib/mirror.js --file "src/components/UserLogin.js"
```
