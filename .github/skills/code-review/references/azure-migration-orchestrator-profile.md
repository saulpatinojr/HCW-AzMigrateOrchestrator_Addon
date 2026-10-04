# Azure Migration Orchestrator repository profile

Use this profile when the repository contains `packages/classification-engine` and `rules/azure`. The
HybridCloudWorks site profile (`repository-profile.md`) does **not** apply here; it is retained for the
sister repository and as the pack's reference implementation.

## Component routing

| Touched path | Component | Review focus |
| --- | --- | --- |
| `rules/**` | Versioned support rules (data) | Every rule has Microsoft Learn sources with `retrievedOn`; no `unsupported` without alternatives; ASR never a default migration tool; `npm run rules:validate` passes and `rules/snapshots/current.json` was regenerated (`amo rules snapshot`) with a change report in the PR body. |
| `packages/domain/**` | Shared types and taxonomy | Changing an enum changes the rule schema and golden files — all three must move together. |
| `packages/csv-ingestion/**` | Untrusted input boundary | Formula neutralisation, size/row limits, no raw-row logging, provenance for every field. |
| `packages/classification-engine/**` | Decision engine | Confidence never exceeds evidence (unauthenticated cap), unknowns stay unknown, infrastructure/identity/configuration/data stay separate dimensions. Golden test updated deliberately, never bent to fit. |
| `packages/agents/**` | Orchestrator and Safety Agent | Safety checks may only be strengthened; demo refuses authenticated providers. |
| `packages/terraform-generator/**`, `packages/runbook-generator/**` | Generated artifacts | No secret literals, dry-run default, "not production" labels intact. |
| `apps/lab-api/**`, `apps/lab-web/**` | Public demo surface | Owner-token isolation, TTL, no execution routes, security headers, no credentials requested. |
| `apps/appliance-api/**` | Enterprise edition | Fails closed without sign-in; refuses client secrets in env. |
| `infrastructure/**` | Terraform, Docker, Coder, proxy | No privileged containers, no Docker socket exposure, no secrets in tfvars. |
| `.github/**` | Governance | Also apply `review-copilot-customization`. |

## Verification commands

```bash
npm ci && npm test            # build + 50+ unit/integration/golden/security tests
npm run rules:validate        # rule corpus + snapshot checksum
```

Terraform under `infrastructure/terraform` is validated by `iac-validate.yml` (`fmt -check`, `init -backend=false`, `validate`). If terraform is unavailable locally, report it as skipped — CI covers it.

## Cross-cutting rules

- No credentials, tokens or customer inventories in the repo, fixtures included. `tests/security/no-secrets.test.mjs` is the floor, not the ceiling.
- Documentation lives in `docs/`; completed work moves to `CHANGELOG.md`; limitations to `VALIDATION.md`.
- Owner-facing commands: PowerShell and bash both acceptable here; no placeholders in pasteable commands.
