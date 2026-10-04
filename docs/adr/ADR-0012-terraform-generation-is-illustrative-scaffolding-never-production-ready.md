# ADR-0012: Terraform generation is illustrative scaffolding, never 'production-ready'

**Status:** Accepted · **Date:** 2026-10-03

## Context

§21: generated code is not approved until fmt/validate/scan/plan/approval.

## Decision

Generate modules by separation of concerns with TODO markers where the CSV lacks data; omit import blocks and drift detection until the destination is inspected; Safety Agent fails any bundle text claiming production readiness.

## Consequences

Honest output; the owner's own review pipeline remains the gate.
