# ADR-0004: PostgreSQL for enterprise persistence; in-memory TTL store for the demo

**Status:** Accepted · **Date:** 2026-10-03

## Context

Uploaded inventories are sensitive infrastructure metadata (§3.12); the demo must expire and delete quickly. The enterprise edition needs durable projects, waves and approvals.

## Decision

Demo: in-memory store, UUIDv4 IDs, owner token (hashed), TTL sweep, immediate delete, nothing on disk. Enterprise: PostgreSQL (compose file provisions it); repository layer to be added with the enterprise persistence work.

## Consequences

Demo restarts lose assessments by design; enterprise persistence is a tracked gap in VALIDATION.md.
