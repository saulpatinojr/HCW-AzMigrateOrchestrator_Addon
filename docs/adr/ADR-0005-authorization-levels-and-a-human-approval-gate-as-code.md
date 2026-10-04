# ADR-0005: Authorization levels and a human approval gate as code

**Status:** Accepted · **Date:** 2026-10-03

## Context

Read-only must be the default and destructive actions need explicit approval (§3.9–3.10, §13).

## Decision

Seven ordered levels; `EDITION_MAX_LEVEL.demo = planning`; `gate()` requires both level and a recorded approval per operation+target; the enterprise API refuses to start if a variable looks like a client secret.

## Consequences

The demo is technically unable to execute; execution paths in enterprise fail closed until approvals exist.
