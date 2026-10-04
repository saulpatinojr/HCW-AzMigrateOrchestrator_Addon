# ADR-0018: Per-operation confidence

**Status:** Accepted · **Date:** 2026-10-03

## Context
A single confidence number hid that a VM is well understood for a resource-group move and less so for a region move or cross-tenant migration.

## Decision
`ResourceDecisionRecord.confidenceByOperation` carries a score/band for each of the six operations, derived from the rule's per-operation support state plus the shared evidence penalties and the unauthenticated cap. `confidence` remains the value for the requested operation.

## Consequences
Users can compare operations without re-running; reports and the UI show both; golden files regenerated.
