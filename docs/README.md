# Documentation index

This repository documents the web-front edition only. The working plan, requirement ledger, architecture overview, rule
documentation and the canonical ADR log live upstream in
[`HCW-AzMigrateOrchestrator_App/docs`](https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_App/tree/main/docs).

| Document | Purpose |
|---|---|
| [`website-integration/integration-guide.md`](website-integration/integration-guide.md) | How hybridcloudworks.com frames the AddOn as a pane at `/tools/migration`: catalogue row, status-proxy shape, sandbox, pane protocol, human verification, env table, what a release hands the site |
| [`website-integration/routes.md`](website-integration/routes.md) | The site route, AddOn origin, status route, app setting, container and vault-key names |
| [`api/openapi.yaml`](api/openapi.yaml) | The lab API contract (`tests/contract` keeps it aligned with the implementation) |
| [`deployment/lab-host.md`](deployment/lab-host.md) · [`deployment/coder.md`](deployment/coder.md) | Hosting on the website's lab host through its `addons` role (image, env, owner steps, rollback by digest); the optional Coder guided lab |
| [`operations/runbook.md`](operations/runbook.md) | Health over SSH, `docker logs hcw-addon-migration`, restart/upgrade/rollback, kill switches, abuse bounds |
| [`security/threat-model.md`](security/threat-model.md) | Assets, threats and controls (in-memory inventories, owner tokens, TTL, framing and sandbox, fail-closed verification, rate limit and concurrency, trust-proxy, no execution surface) |
| [`demo/user-guide.md`](demo/user-guide.md) · [`demo/output-bundle.md`](demo/output-bundle.md) | What a user does in the explorer and what the output bundle contains |
| [`partners/`](partners/) | One-pagers for the platforms the lab showcases (Hostinger, Cloudflare, Docker, HashiCorp, Coder, GitHub, Microsoft) |
| [`adr/`](adr/) | Copies of the upstream decisions that shape this edition (ADR-0030, the pane model, pending upstream) |
| [`../VALIDATION.md`](../VALIDATION.md) | What was executed and what was not; limitations |
