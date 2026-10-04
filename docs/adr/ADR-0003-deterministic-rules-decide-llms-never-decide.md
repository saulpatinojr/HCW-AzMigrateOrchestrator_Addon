# ADR-0003: Deterministic rules decide; LLMs never decide

**Status:** Accepted · **Date:** 2026-10-03

## Context

Low evidence must never produce high confidence; decisions must be reproducible and auditable (§3.6–3.8).

## Decision

Dispositions come only from versioned JSON rules applied by deterministic code. Agents are bounded procedures; any future LLM assistance may draft rule proposals or explanations but cannot alter a decision without a rule change.

## Consequences

Golden tests pin behaviour; rule changes are reviewed as data with Microsoft Learn provenance.
