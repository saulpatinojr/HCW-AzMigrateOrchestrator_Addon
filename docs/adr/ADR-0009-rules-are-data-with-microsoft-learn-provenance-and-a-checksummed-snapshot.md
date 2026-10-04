# ADR-0009: Rules are data with Microsoft Learn provenance and a checksummed snapshot

**Status:** Accepted · **Date:** 2026-10-03

## Context

§11: no permanent support assumptions only in code; versioned, evidence-backed, testable.

## Decision

JSON rules under `rules/azure` (authored via `scripts/author-rules.mjs`), organizational overlays by precedence, `rules/snapshots/current.json` checksum enforced by `amo rules validate`; rollback is `git revert` + re-snapshot.

## Consequences

Every decision cites rule ID/version; stale rules (past review date) surface as warnings.
