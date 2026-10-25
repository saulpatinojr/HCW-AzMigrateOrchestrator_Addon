# Azure Migration Orchestrator AddOn repository profile

Use this profile for `saulpatinojr/HCW-MigrateOrchestrator_AddOn` (the downstream web-front edition, ADR-0028, ADR-0030). The engine, rules, CLI, UI components, and enterprise appliance live upstream in `saulpatinojr/HCW-MigrateOrchestrator_App`.

## Component routing

| Touched path | Component | Review focus |
| --- | --- | --- |
| `apps/lab-api/**`, `apps/lab-web/**` | Public demo surface & pane | Owner-token isolation, TTL, no execution routes, security headers, fail-closed human verification, pane protocol (`hcw-addon`), no credentials requested, no vendor names in the pane. |
| `infrastructure/**` | Docker, Coder (`amo-guided-lab`) | No privileged containers, no Docker socket exposure (`tcp://coder-docker-proxy:2375` only), digest-pinned images, `drop = ["ALL"]`, `no-new-privileges:true`, no secrets in tfvars. |
| `tests/**` | E2E, contract, security, manifest | Two-way OpenAPI parity (`tests/contract`), edition boundary (`tests/security/edition-boundary.test.mjs`), version alignment (`tests/version-alignment.test.mjs`). |
| `.github/**` | Governance & CI/CD | SHA-pinned actions, least-privilege permissions; also apply `review-copilot-customization`. |

## Verification commands

```bash
npm ci && npm test            # API, contract, boundary, manifest, version-alignment, and no-secrets tests
npm run e2e                   # Playwright browser suite
```

Terraform under `infrastructure/coder/template` is validated by `iac-validate.yml` (`fmt -check`, `init -backend=false`, `validate`). If terraform is unavailable locally, report it as skipped — CI covers it.

## Cross-cutting rules

- No credentials, tokens or customer inventories in the repo, fixtures included. `tests/security/no-secrets.test.mjs` is the floor, not the ceiling.
- Documentation lives in `docs/`; completed work moves to `CHANGELOG.md`; limitations to `VALIDATION.md`.
- Owner-facing commands: PowerShell and bash both acceptable here; no placeholders in pasteable commands.
