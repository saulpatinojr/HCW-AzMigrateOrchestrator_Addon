# ADR-0015: Do not create empty placeholder apps or packages

**Status:** Accepted · **Date:** 2026-10-03

## Context

§6: 'Do not create meaningless empty files or directories.'

## Decision

`apps/enterprise-web`, `apps/worker`, `packages/ui` are not created in this build; the demo UI is static vanilla JS served by the API. They are listed as planned in the ledger.

## Consequences

Honest repository shape; adding them later is additive.
