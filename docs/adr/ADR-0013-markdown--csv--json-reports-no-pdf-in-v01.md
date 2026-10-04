# ADR-0013: Markdown + CSV + JSON reports; no PDF in v0.1

**Status:** Accepted · **Date:** 2026-10-03

## Context

Reports must be diffable, greppable and git-friendly for golden tests.

## Decision

Markdown for narrative, CSV/JSON for data; PDF/HTML export deferred.

## Consequences

Golden tests are stable; PDF can be layered later.
