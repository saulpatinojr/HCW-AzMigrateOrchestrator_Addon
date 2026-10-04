# ADR-0006: Modular monolith plus isolated workers

**Status:** Accepted · **Date:** 2026-10-03

## Context

Microservices would multiply deployment surface for a two-person platform.

## Decision

Apps are thin HTTP shells over shared packages; long-running copy/sync orchestration belongs in a separate worker process (not yet built) sharing the same packages.

## Consequences

Simple VPS deployment; worker added when controlled execution is implemented.
