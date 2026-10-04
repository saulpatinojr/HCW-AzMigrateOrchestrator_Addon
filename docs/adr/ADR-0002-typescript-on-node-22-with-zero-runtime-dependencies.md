# ADR-0002: TypeScript on Node 22 with zero runtime dependencies

**Status:** Accepted · **Date:** 2026-10-03

## Context

The demo runs on a VPS exposed to the public internet; every dependency is attack surface and supply-chain risk. Python offered no concrete advantage for the analysis components.

## Decision

TypeScript everywhere; Node built-ins for HTTP, crypto, testing (`node --test`), ZIP (own STORE writer). Zod/Fastify/Next.js deferred until a concrete need.

## Consequences

Smaller image and audit surface; hand-written validators (`validateRule`, `parseCreateAssessmentRequest`) mirrored by a JSON Schema for external tooling.
