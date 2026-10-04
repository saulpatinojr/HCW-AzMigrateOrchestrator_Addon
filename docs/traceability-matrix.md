# Traceability matrix

| Req | Implementation | Tests | Documentation |
|---|---|---|---|
| R-01 | `packages/*`, `apps/*` | `packages/agents/src/orchestrator.test.ts` | `docs/architecture/overview.md`, ADR-0001 |
| R-02, R-10, R-11 | `packages/domain/src/{taxonomy,decision}.ts` | `packages/domain/src/domain.test.ts` | `docs/product/editions.md` |
| R-03, R-15 | `packages/authorization`, `apps/appliance-api`, `packages/azure-discovery` | `authorization.test.ts`, `enterprise.test.ts`, `discovery.test.ts` | `docs/deployment/enterprise.md`, ADR-0005, ADR-0007 |
| R-04 | `apps/lab-api/src/app.ts`, `packages/azure-discovery/assertDemoCannotUseAzure`, `EDITION_MAX_LEVEL` | `api.test.ts` ("no execution surface"), `orchestrator.test.ts` ("refuses authenticated provider") | `docs/demo/user-guide.md`, ADR-0008 |
| R-05 | spread across engine | safety agent tests; classification tests (ASR, cap, unknown) | `docs/security/threat-model.md` |
| R-06 | — | — | `docs/repository-existing-files-review.md` |
| R-07 | `scripts/package-repository.{sh,ps1}`, `repository.manifest.json` | `tests/end-to-end/repository-manifest.test.mjs` | `README.md` |
| R-12, R-13 | `rules/azure/*.json`, `scripts/author-rules.mjs`, `packages/evidence-engine` | `evidence.test.ts` (clean corpus, precedence, conflicts, duplicates, snapshot diff) | `docs/rules/README.md`, ADR-0012 |
| R-14 | `packages/agents/src/{definitions,orchestrator,safety}.ts` | `orchestrator.test.ts` (19 agents, e2e, safety) | `docs/agents/README.md` (generated) |
| R-16 | `classify.ts` cross-tenant branch, `defaultIntent` | `classify.test.ts` ("cross-tenant managed identity") | `docs/product/cross-tenant.md` |
| R-17 | `packages/landing-zone` | covered via classification tests (prerequisites) | ADR-0011 |
| R-18 | `packages/csv-ingestion` | `ingest.test.ts` (BOM, quoting, delimiter, duplicates, formula injection, limits, missing ID) | `docs/security/threat-model.md` |
| R-19 | `apps/lab-web/public/{index.html,app.js}`, `contracts/parseCreateAssessmentRequest` | `contracts.test.ts`, `api.test.ts` | `docs/demo/user-guide.md` |
| R-20 | `apps/lab-web` | `api.test.ts` (static + CSP) | `docs/demo/user-guide.md` |
| R-21, R-22 | `packages/report-engine`, `packages/artifact-generator` | golden test, orchestrator e2e | `docs/demo/output-bundle.md` |
| R-23 | `packages/terraform-generator` | golden `terraform/main.tf`; safety secret scan | ADR-0013 |
| R-24 | `packages/runbook-generator` | golden `runbooks/migration.md` | — |
| R-25 | `packages/validation-engine` | orchestrator e2e (bundle contains validation/*) | — |
| R-26 | `packages/workspace-provider`, `infrastructure/coder` | `workspace.test.ts` | `docs/deployment/coder.md`, ADR-0010 |
| R-27 | — | — | `docs/website-integration/routes.md` |
| R-28 | `.github/**` | `.github/workflows/ci.yml` runs tests | `.github/setup/*.md`, existing-files review |
| R-29 | `.github/workflows/*.yml`, `tests/security/no-secrets.test.mjs` | that test | `VALIDATION.md` |
