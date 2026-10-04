# CLAUDE.md — working agreement for Claude Code in this repository

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon`, the **downstream web-front edition** (ADR-0028): the CSV lab API, the
static harness, the browser e2e suite, lab infrastructure and the website-integration docs. The engine, rules, CLI and UI
components live upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App` and arrive here as `@hybridcloudworks/migration-core`
and `@hybridcloudworks/migration-ui`. Nothing here may reach Azure; `tests/security/edition-boundary.test.mjs` enforces it.

- Interim dependency contract: `package.json` links both packages to the sibling `../HCW-AzMigrateOrchestrator_App/dist-packages`;
  CI, the lab image and `scripts/bootstrap-app.sh` check out upstream at `APP_REF` (a release tag, never `main`). Once the
  packages are on npm, replace the links with exact versions and retire `core-update.yml` in favour of Dependabot.
- Do not change engine behaviour, rules or UI components here: change them upstream, release, and let `core-update` bring the
  release down. Only this edition's own code (lab API, harness, e2e, infra, docs) is edited here.
- Run `npm run app:bootstrap` (or have the sibling built) before `npm test`; run `npm test` and, for anything touching the
  explorer or the API, `npm run e2e` before claiming anything works. Never claim a check passed that you did not run.
- Never weaken: the lab's inability to construct an Azure provider, the unauthenticated confidence cap, owner-token isolation,
  the 5 MB / 5,000-row limits, exact-origin CORS, Turnstile on uploads, the "not production" labels.
- No secrets, tokens, customer inventories or real tenant/subscription IDs anywhere, including fixtures and tests.
- Owner-pasteable commands: no placeholders; bash and PowerShell both acceptable.
- ADRs are recorded upstream (shared numbering); copy edition-relevant ones into `docs/adr/`. Record limitations in `VALIDATION.md`.
