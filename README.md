# Azure Migration Orchestrator — core, rules, CLI, lab and explorer UI (`_Addon`)

One of two public repositories (ADR-0027):

| Repository | Holds |
|---|---|
| **`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`** (this one) | Shared migration intelligence core (`packages/*`), versioned rule corpus (`rules/`), the `amo` CLI, the CSV **lab API** and web harness, and the `@amo/ui` **Migration Explorer** package mounted by hybridcloudworks.com |
| `saulpatinojr/HCW-AzMigrateOrchestrator_App` | The authenticated, read-only-by-default **Azure appliance** (API, web UI, worker, Azure auth/ARM/Resource Mover clients, Container Apps Terraform). Consumes this repository's packages at a pinned version |

The lab never touches Azure, never asks for credentials and cannot execute anything. `tests/security/edition-boundary.test.mjs` fails the build if any workspace here depends on an Azure-touching package or SDK.

For every resource the engine answers: ARM move? Resource Mover? Azure Migrate or another service? ASR (DR only)? Database/data mechanism? Recreate infrastructure? Migrate data separately? Rebuild identity/network/DNS/config? Or retain, retire, replace, redesign, escalate — with evidence, missing information, confidence, prerequisites, risks, validation and rollback, and generated Terraform/PowerShell/CLI/runbooks. "Unsupported" is never the final answer.

## Quick start

```bash
npm ci && npm test                       # build + tests (npm run e2e adds the Playwright browser suite)
npm run rules:validate
node apps/cli/dist/main.js assess --csv samples/resources-csv/sample-resources.csv --out ./out --region westus3 --zip
npm run lab:api                          # http://localhost:8080 — lab UI + API
docker compose up --build                # same, containerized
```

PowerShell: `npm ci; npm test; npm run rules:validate; node apps/cli/dist/main.js assess --csv samples/resources-csv/sample-resources.csv --out .\out --region westus3 --zip`

Single executable (no Node at run time): `bash scripts/build-sea.sh` → `dist-sea/amo assess --csv inventory.csv --out ./out --region westus3`.

## Repository map

| Path | What |
|---|---|
| `packages/domain` | Taxonomy, decision record, rule model, intent, landing zone |
| `packages/csv-ingestion` | Hardened `resources.csv` parser with provenance |
| `packages/evidence-engine` · `rules/` | Versioned, checksummed, Microsoft-Learn-sourced rules |
| `packages/classification-engine` | Per-dimension dispositions, confidence, waves |
| `packages/agents` | 19 bounded agents, orchestrator, Safety Agent |
| `packages/{report,terraform,runbook,artifact}-*` | The `assessment-output/` bundle |
| `packages/authorization` · `packages/workspace-provider` · `packages/observability` | Levels + approval gate, Coder abstraction, redacted logging |
| `packages/azure-discovery` | The `DiscoveryProvider` **interface**, fixture provider and demo guard only; the Azure clients are in `saulpatinojr/HCW-AzMigrateOrchestrator_App` |
| `packages/contracts` · `packages/ui` | API contracts and the React explorer (`@amo/ui`, to be published as `@hybridcloudworks/migration-ui`) |
| `apps/cli` · `apps/lab-api` · `apps/lab-web` · `apps/ui-harness` | Entry points |
| `infrastructure/` | Lab Dockerfile, Hostinger VPS + Cloudflare edge Terraform, Coder template |
| `docs/` | Requirement ledger, traceability, **canonical ADR log**, agents, API, deployment, security, website integration, `WORKING-PLAN.md` |

Start with `WORKING-PLAN.md`, then `docs/requirements-ledger.md`, `docs/architecture/overview.md` and `VALIDATION.md`.

## Release contract

`_App` pins a release tag of this repository (interim) and, after Phase 2 of the working plan, exact versions of `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui`. Nothing consumes `main`. Images are published to `ghcr.io/saulpatinojr/azure-migration-orchestrator-lab` with provenance and SBOM; deployments must reference digests, not tags.

## Principles baked into code

Read-only default · lab technically unable to reach Azure · infrastructure/identity/configuration/data decided separately · migration ≠ DR (ASR is never a default migration tool) · unknown stays unknown · low evidence never yields high confidence · every output labelled, hashed and traceable to rule versions · nothing generated is "production-ready" until validated.

License: MIT (see `LICENSE`, `NOTICE`). Security: `SECURITY.md`.
