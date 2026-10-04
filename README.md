# Hybrid Cloud Works Migration Explorer — web-front edition (`_Addon`)

The slim, downstream edition of the Azure Migration Orchestrator (ADR-0028): a CSV **lab API** and the explorer integration for
hybridcloudworks.com, built on the published core. It never touches Azure, never asks for credentials and cannot execute anything.

| Repository | Role |
|---|---|
| `saulpatinojr/HCW-AzMigrateOrchestrator_App` | Upstream: the appliance and the engine, rules, CLI and UI components it is built on. Publishes `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui` |
| **`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`** (this one) | Downstream: lab API, static harness, browser e2e, Hostinger VPS + Cloudflare edge Terraform, Coder guided-lab template, website-integration and partner docs. Depends on exact versions of the two packages and nothing else upstream |

Updates flow downstream automatically: `.github/workflows/core-update.yml` watches upstream releases, tests this edition against
each one (unit tests and the Playwright suite) and opens a pull request bumping the pinned release, labelled `compatible` or
`needs-adaptation`. `tests/security/edition-boundary.test.mjs` fails the build if anything here could reach Azure.

## Quick start

Until the packages are on npm, the upstream product is a sibling checkout at the pinned release (interim contract):

```bash
npm run app:bootstrap        # clones ../HCW-AzMigrateOrchestrator_App at APP_REF, builds it and assembles its packages
npm ci && npm test
npm run lab:api              # http://localhost:8080 — lab UI + API
npm run e2e                  # Playwright: explorer through the harness against the real lab API
```

PowerShell: `bash scripts/bootstrap-app.sh; npm ci; npm test; npm run lab:api`

Container image: build from the **parent** directory holding both checkouts:
`docker build -f HCW-AzMigrateOrchestrator_Addon/infrastructure/docker/Dockerfile.lab .` (see `docker-compose.yml`).

## Repository map

| Path | What |
|---|---|
| `apps/lab-api` | The CSV lab API: in-memory assessments with owner tokens and TTL, exact-origin CORS, Turnstile, bundle download, Coder hand-off |
| `apps/lab-web` · `apps/ui-harness` | Static demo page; Vite host that mounts `@hybridcloudworks/migration-ui` exactly as the website does |
| `tests/e2e` | Playwright journey: upload → questionnaire → results → detail → bundle → delete; asserts no password fields |
| `infrastructure/` | Lab Dockerfile (two-tree build), Hostinger VPS and Cloudflare edge Terraform, Coder template and workspace image |
| `docs/` | Website integration guide and routes, partner one-pagers, lab deployment and operations, demo user guide, lab threat model, OpenAPI spec |

The canonical ADR log, the requirement ledger and `WORKING-PLAN.md` live upstream.

## Release contract

`APP_REF` in `.github/workflows` is the upstream release this edition is built against; it changes only through a reviewed
pull request (opened automatically by `core-update`). The lab image is published to
`ghcr.io/saulpatinojr/azure-migration-orchestrator-lab` after passing a vulnerability scan; deploy by digest, never by tag.

License: MIT (see `LICENSE`, `NOTICE`). Security: `SECURITY.md`.
