# ADR-0014: Structured, redacted, content-free logging with OTel-compatible attributes

**Status:** Accepted · **Date:** 2026-10-03

## Context

§7 observability; §3.12 sensitivity.

## Decision

`@amo/observability`: JSON lines, secret redaction, objects never serialized (no raw rows), correlation IDs in generated scripts; exporter attachment deferred.

## Consequences

Logs are safe to ship to a shared collector.
