# Mirror Pre-Commit Code Review Honesty Layer

The honesty layer is the operational expression of the **G10DC Trellis Standard**: **the processing engine reasons over verified evidence with stated confidence, never hallucinates capabilities or impact.**

## Domain & Scope
**Domain**: Multi-Perspective Pre-Commit Review Engine

## Core Epistemic Rules

1. **Four Lenses: Audits Security, Correctness, Maintainability, and Performance across staged diffs.**
2. **Diff Scope: Audits actual git diff lines. Does NOT perform whole-codebase AST reachability (delegate to trellis).**
3. **Confidence Rating: High (diff parsed with clean AST/regex validation), Medium (partial diff), Low (unparsed diff).**

## Three-Tier Confidence Model

- **High Confidence**: Full AST/schema validation passing, deterministic evidence available, verified state.
- **Medium Confidence**: Heuristic analysis or partial indexing; requires agent verification step.
- **Low Confidence**: Inferred or unindexed target; candidate output ONLY, never auto-committed.

## Epistemic Invariant

> Absence of evidence is not evidence of absence. Output is presented as a structured candidate set with confidence scores so caveats cannot be silently dropped downstream.
