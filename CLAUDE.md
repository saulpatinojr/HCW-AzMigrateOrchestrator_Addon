# CLAUDE.md — working agreement for Claude Code in this repository

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon`, the **downstream web-front edition** (ADR-0028): the CSV lab API, the
pane app the website frames (`apps/lab-web`), the browser e2e suite, the lab image and the website-integration docs. The engine, rules, CLI and UI
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
  the 5 MB / 5,000-row limits, exact-origin CORS, fail-closed human verification on uploads, the per-client rate limit and
  concurrency cap, `frame-ancestors` from env, the "not production" labels.
- The pane app is `apps/lab-web`; the site frames it at `/tools/migration`. Keep the pane protocol (`{ type: 'hcw-addon',
  id: 'migration', state }` posted to `/api/health.siteOrigins` on transitions only; states `loading|ready|working|unavailable`;
  `navigate`), the flat `/api/health` envelope and the `X-Addon-*` headers (`docs/website-integration/integration-guide.md`).
  No vendor names in anything a visitor can read in the pane.
- No secrets, tokens, customer inventories or real tenant/subscription IDs anywhere, including fixtures and tests.
- Owner-pasteable commands: no placeholders; bash and PowerShell both acceptable.
- ADRs are recorded upstream (shared numbering); copy edition-relevant ones into `docs/adr/`. Record limitations in `VALIDATION.md`.
