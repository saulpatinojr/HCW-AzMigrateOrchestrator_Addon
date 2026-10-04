# Documentation index

This repository documents the web-front edition only. The working plan, requirement ledger, architecture overview, rule
documentation and the canonical ADR log live upstream in
[`HCW-AzMigrateOrchestrator_App/docs`](https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_App/tree/main/docs).

| Document | Purpose |
|---|---|
| [`website-integration/integration-guide.md`](website-integration/integration-guide.md) | How hybridcloudworks.com mounts the explorer: the npm package, lazy client-only island, Tailwind source scan, Turnstile hand-off, environment variables, acceptance tests |
| [`website-integration/routes.md`](website-integration/routes.md) | The `/education/migration-labs/*` routes to add to the site's route and content inventories |
| [`api/openapi.yaml`](api/openapi.yaml) | The lab API contract (`tests/contract` keeps it aligned with the implementation) |
| [`deployment/vps.md`](deployment/vps.md) · [`deployment/coder.md`](deployment/coder.md) | Running the lab API on the Hostinger VPS; the optional Coder guided lab |
| [`operations/runbook.md`](operations/runbook.md) | Health, logs, restart/upgrade/rollback, rule updates |
| [`security/threat-model.md`](security/threat-model.md) | Assets, threats and controls of the lab (in-memory inventories, owner tokens, TTL, CORS, Turnstile, no execution surface) |
| [`demo/user-guide.md`](demo/user-guide.md) · [`demo/output-bundle.md`](demo/output-bundle.md) | What a user does in the explorer and what the output bundle contains |
| [`partners/`](partners/) | One-pagers for the platforms the lab showcases (Hostinger, Cloudflare, Docker, HashiCorp, Coder, GitHub, Microsoft) |
| [`adr/`](adr/) | Copies of the upstream decisions that shape this edition |
| [`../VALIDATION.md`](../VALIDATION.md) | What was executed and what was not; limitations |
