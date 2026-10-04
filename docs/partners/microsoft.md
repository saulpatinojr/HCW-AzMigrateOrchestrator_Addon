# Microsoft

**What it does here.** Every migration rule in `rules/azure` cites Microsoft Learn (move-support matrix, Resource Mover
support matrices, relocation guidance, service migration docs) with retrieval dates; the resource model follows Azure
Resource Manager types.

**Appliance (Sprint 3, ADR-0022).** Entra ID token validation with app roles; managed identity / workload identity federation;
Azure Resource Graph discovery; ARM `validateMoveResources` as evidence; Azure Resource Mover as the first approval-gated
execution surface; Container Apps + PostgreSQL Flexible Server (Entra-only auth) hosting.

**Where.** `rules/azure/*.json`, `scripts/author-rules.mjs`, `packages/azure-discovery`, `apps/appliance-api`,
`docs/deployment/enterprise.md`.

**What the lab can publish.** Rule coverage by resource provider; most-seen resource types (counts only).
