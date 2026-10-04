# ADR-0017: Three deployables and the planned repository split

**Status:** Accepted · **Date:** 2026-10-03 · **Refined by ADR-0027 (2026-10-04): split performed at first publication; repositories `_App` and `_Addon`; package names `@hybridcloudworks/migration-core` and `migration-ui`**

## Context

The product has an Azure-hosted **appliance** (the real product), a Hostinger-hosted **lab API** ("mini me", CSV-only), and a
**lab UI** embedded in the hybridcloudworks.com content site. The owner wants one concise backend today and a clean split of
appliance from web-feature app later, with Hostinger showcased as the lab platform.

## Decision

- Apps are named by deployable: `apps/appliance-api` (Azure), `apps/lab-api` (Hostinger VPS, Docker, Cloudflare Tunnel),
  `apps/lab-web` (dev harness only), `packages/ui` (React components the site mounts).
- `packages/contracts` is the only seam between UI and core; the UI depends on `@amo/contracts` and `@amo/domain` types only.
- `tests/security/edition-boundary.test.mjs` freezes the boundary: the lab never depends on authenticated discovery or
  execution-level authorization.
- Split plan: when triggered, `packages/*` publish as `@hcw/migration-core` (GitHub Packages); the appliance repo consumes a
  pinned version; this repo keeps the lab apps, `packages/ui` and the partner showcase. Nothing in the engine references an
  app, so the split is a move, not a refactor.

## Consequences

Naming is honest about where things run; the boundary is enforced by tests instead of convention; the eventual split costs a
package publish and two `git filter-repo` runs.
