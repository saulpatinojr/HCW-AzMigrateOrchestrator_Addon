# ADR-0007: Entra ID authentication by delegated OIDC + managed identity/WIF for automation; no client secrets

**Status:** Accepted · **Date:** 2026-10-03

## Context

§13 requires PKCE sign-in, tenant isolation, and forbids secrets in code.

## Decision

Enterprise API accepts only managed identity, workload identity federation, delegated or Azure CLI credential kinds; app roles map to authorization levels (`principalFromClaims`). Token validation (JWKS) is the first integration to add.

## Consequences

Until the validator is wired, every protected enterprise route returns 401 — fail closed, never fake.
