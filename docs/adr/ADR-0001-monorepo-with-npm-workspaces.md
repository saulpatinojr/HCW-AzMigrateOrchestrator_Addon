# ADR-0001: Monorepo with npm workspaces

**Status:** Accepted · **Date:** 2026-10-03

## Context

One intelligence core must serve two deployable editions without duplicating the rules engine (§3.18).

## Decision

Single repository, npm workspaces, `@amo/*` packages compiled with TypeScript project references; apps depend on packages, never on each other.

## Consequences

Atomic changes across engine and editions; one test command; package boundaries enforce that the demo cannot import the enterprise discovery adapter.
