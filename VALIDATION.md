# VALIDATION.md

> **Repository split (2026-10-04, ADR-0027).** This file predates the split of the monorepo into `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` and `saulpatinojr/HCW-AzMigrateOrchestrator_App`. This repository (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`) holds the shared core, rules, CLI, lab API, lab web harness and the UI package. Entries below describe the monorepo as it was; paths that moved to the sibling repository are noted there.

Build date: 2026-10-03 · Environment: Ubuntu container, Node 22.22, npm 10.9, zip, python3. **Not available:** terraform, pwsh,
docker, network access to Azure/GitHub/Microsoft Learn. Everything below distinguishes what was executed from what was not.

## Executed and passing

| Check | Command | Result |
|---|---|---|
| TypeScript build (20 projects) | `npm run build` | clean |
| Unit/integration/golden/security/contract tests | `npm run test:only` | **51 passed, 0 failed** (count after this file and `repository.manifest.json` exist) |
| Rule corpus | `node apps/cli/dist/main.js rules validate` | 34 rules, 0 issues/duplicates/conflicts/stale; snapshot `1.0.34` matches `rules/snapshots/current.json` |
| CLI end-to-end (region relocation) | `amo assess … --region westus3 --zip` | 29 resources: 7 native-move, 2 orchestrated, 11 recreate-and-migrate, 6 recreate-only, 2 retain, 1 unknown; 0 safety findings; 44-file bundle + zip |
| CLI end-to-end (cross-tenant) | `amo assess … --cross-tenant` | 16 recreate-and-migrate, 12 recreate-only, 1 unknown |
| Demo API smoke | `node apps/lab-api/dist/server.js` + curl | `/api/health` ok, `/` 200, `/api/sample.csv` 200; lifecycle, isolation, 400/413/422/403 paths covered by `api.test.ts` |
| Golden files | `npm run goldens:update` then golden test | deterministic (fixed clock, IDs normalised) |
| Repository ZIP | `bash scripts/package-repository.sh` | created and listed; excluded-path leak check passed (see bottom) |

## Implemented with documented limitations

- **Enterprise edition:** authorization levels, approval gate, app-role mapping, provider interface and fail-closed API exist. **Not implemented:** Entra token validation (JWKS/PKCE flow), Azure Resource Graph adapter, service-API enrichment, Lighthouse, controlled execution, PostgreSQL repository, `apps/enterprise-web`, `apps/worker`. Mocks are never presented as production behaviour (`AzureResourceGraphDiscoveryProvider.discover` throws).
- **Coder lab:** provider abstraction with tests; template authored; **not validated** against a live Coder deployment; workspace image `amo-lab-workspace` not yet built/published.
- **Rules:** 34 rules cover the 24 required types + 10 extras. Microsoft Learn URLs and support statements were authored from documentation knowledge on 2026-10-03 and **not fetched live** here; several support states are marked `conditional` where the matrix has caveats. Required before publication: open every `documentationSources[].url`, confirm each `support` state against the current move-support matrix, and bump `reviewDate`.
- **Terraform generation:** modular scaffolding for 16 resource types; import blocks and drift detection deliberately deferred (ADR-0012). Generated output was **not** run through `terraform validate` here (binary absent); `iac-validate.yml` covers the repository's own Terraform in CI.
- **Infrastructure:** `Dockerfile.demo`, compose files, Caddyfile, VPS Terraform and cloud-init were **not** built or applied (no docker/terraform). Image tags are pinned by tag, not digest; GitHub Actions are pinned by version tag, not SHA — both flagged in-file and must be converted before enabling branch protection.
- **PowerShell:** `scripts/package-repository.ps1` and generated `.ps1` scaffolding were not executed (no pwsh). Bash equivalents were executed.
- **Demo UX:** 27 of 29 §18 items present; "Open in Coder" and the guided lab appear only when a workspace provider is configured.
- **Observability:** structured redacted logging implemented; OpenTelemetry exporter not wired (ADR-0014).

## Sprint 1 additions (2026-10-03)

- **Executed:** 63 tests pass including `packages/ui` server-render tests, lab-api CORS/Turnstile tests (siteverify mocked), edition-boundary tests. Build clean with the new React/Radix dependencies.
- **Not executed:** Playwright e2e for the explorer (no browser here; spec in `docs/website-integration/integration-guide.md` §6); `terraform init/validate` for `lab-hostinger` and `lab-cloudflare` (no terraform binary — CI matrix covers both; **the Hostinger provider source and resource names are marked [VERIFY] and `init` is the safety net**); `publish-lab-image.yml` (needs GitHub); Turnstile against the real siteverify endpoint; Cloudflare Tunnel end to end.
- Dependencies added: `react`, `react-dom`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs` (UI package only; lab-api remains zero-dependency).

## Sprint 2 additions (2026-10-03)

- **Executed:** 70 tests pass (state-impact ID derivation and classification, HCP output invariants, manifest/schema check with file and MCP sources, Learn parser/diff on fixtures and the live corpus); `refresh-rules-from-learn.mjs --from <fixture>` runs offline end to end.
- **Not executed (no terraform/network here):** `terraform validate` of generated bundles and the real-schema argument check — now a CI job (`generated-terraform`) so they run on every push; live fetch of the Learn tables (source path **[VERIFY]**); `rules-refresh.yml` PR creation; Terraform MCP adapter against a live server.
- Generated HCL formatting is normalized by `terraform fmt` in CI before validation rather than asserted byte-exact.

## Sprint 3 additions (2026-10-03)

- **Executed:** 84 tests pass — JWKS validation with a generated RSA key (tamper, tenant, audience, expiry, unknown kid), credential flows against fakes, Resource Graph paging and 403 handling, `validateMoveResources` 202→409/204, Resource Mover gating per role/approval, appliance API end to end (401 fail-closed, discovery → assessment → validate-move evidence → ownership isolation → approvals → execution → audit), PostgreSQL repository SQL against a fake client, lab boundary extended to `azure-auth`/`azure-execution`.
- **Not executed (no Azure/network/terraform here):** anything against a real tenant — JWKS fetch, Resource Graph, ARM validation, Resource Mover ([VERIFY] 2023-08-01 request shapes), PostgreSQL connectivity (the Entra token-as-password provider for `pg` is not wired; `DATABASE_URL` currently expects local trust auth or a token-bearing URL), `appliance-azure` Terraform (`iac-validate.yml` covers fmt/init/validate), `Dockerfile.appliance` build.
- New runtime dependency: `pg` (appliance only). Lab remains zero-dependency.

## Sprint 4 additions (2026-10-03)

- **Executed:** 85 tests — workspace endpoint hidden when disabled (404), in-memory provider lifecycle through the API, one-time bundle token (works once, then 404; never grants the assessment itself).
- **Not executed:** Coder workspace creation against a live deployment, workspace image build, `coder templates push`.

## Sprint 5 additions (2026-10-03)

- **Executed:** 86 tests; `scripts/build-sea.sh` built `dist-sea/amo` (120 MB) here and it ran `rules validate`, `rules coverage` and a full `assess` from `/tmp` with embedded rules; coverage endpoint and telemetry (opt-in, identifier-free) tested; overlay change caught by the checksum gate, change report reviewed, snapshot 1.0.35, goldens regenerated.
- **Not executed:** macOS/Windows SEA builds (CI matrix), release publishing, provenance attestation of the binaries.
- Dev dependencies added: `esbuild`, `postject` (build-time only).

## Sprint 6 additions (2026-10-03)

- **Executed:** 88 tests — scope inventory delegation flag and relationship derivation, appliance API `/api/scopes` and automatic cross-tenant intent (fixture + fake ARG), `pg` Entra password provider wiring (injected pool factory), refusal of password URLs and missing credentials. `apps/appliance-web` type-checks and builds with Vite (output 1 chunk > 500 kB: MSAL; chunking is a follow-up).
- **Not executed:** MSAL sign-in and token acquisition in a browser, Lighthouse projection on a real managing tenant, PostgreSQL token login against Azure Database for PostgreSQL.
- New runtime dependencies (appliance-web only): `@azure/msal-browser`, `vite`, `@vitejs/plugin-react` (build). Tailwind via play CDN pending a compiled build.

## Sprint 7 additions (2026-10-03)

- **Executed:** 92 tests — operation polling status mapping and retry-after, worker `runOnce` (due/not-due, completion audit), API operation recording and listing, PostgreSQL operations SQL; `apps/appliance-web` and `apps/ui-harness` build with compiled Tailwind (15 kB CSS incl. `packages/ui` classes).
- **Not executed:** Playwright e2e — the sandbox cannot download browsers (`playwright install` blocked); the spec and CI job are in place and run on GitHub-hosted runners. Worker against real Azure operation URLs.
- Dev dependencies added: `@playwright/test`, `tailwindcss`, `@tailwindcss/vite`.

## Phase 1 additions (2026-10-04)

- **Environment:** Windows 11, Node 26.5, npm 11.17 (CI targets Node 22 — this run is not evidence for Node 22). No terraform, docker, pwsh or Azure access used.
- **Executed:** `npm ci`; `npm test` — 94 tests pass (92 + 2 new contracts tests); `npm run rules:validate` — 35 rules, snapshot 1.0.35, checksum matches. Content audit of the 359 files Git would add: no GUIDs outside obviously synthetic test values, no secret-shaped strings outside detector regexes, no `/subscriptions/<real id>`, no stray state/plan/env/zip files; emails present are documentation addresses (`security@`, `conduct@`, `ops@migrate-demo`) and fake PostgreSQL user@host examples.
- **Not executed:** `publish-images.yml` after the matrix fix (needs GitHub Actions); Playwright e2e; anything against the two new GitHub repositories — nothing has been pushed to `_App` or `_Addon`.
- **Limitation:** the audit above is grep-based. Run gitleaks (already in `security.yml`) on each repository's first commit before pushing; both repositories are public.

## Repository split verification (2026-10-04)

- **Environment:** Windows 11, Node 26.5, npm 11.17, Terraform CLI, PowerShell 7.6 (CI targets Node 22 — not evidence for Node 22). No Docker build, no Azure access.
- **Executed:** tree generated from the monorepo by copy; `npm install` (new lockfile) then `npm ci` clean; `npm test` — **74 pass, 0 fail** (edition-boundary rewritten for the split); `npm run rules:validate` — 35 rules, snapshot 1.0.35, checksum matches; `terraform fmt -check -recursive infrastructure` clean; Coder template `terraform init -backend=false && terraform validate` passes (coder 2.19.0, docker 3.9.0 providers); `scripts/package-repository.ps1` — 316 files, `.env.example` included, no `.git/`, `node_modules/`, `dist/` or `.env` leak.
- **Not executed:** `terraform init/validate` for `lab-hostinger` and `lab-cloudflare` (CI `iac-validate`); Playwright e2e; `publish-images.yml`, `release-cli.yml`; `scripts/package-repository.sh` (no `zip` on this machine); anything against GitHub — this tree has no commits and no remote.
- **GitHub Actions after the first push (2026-10-04):** `ci` jobs `build-test` and `e2e` green at `5ae2051`; `generated-terraform` was red until the generator fixes in this commit (locally: generated bundles for `--region westus3` and `--cross-tenant` pass `terraform init -backend=false` and `validate`, root and hcp). `security` green. `publish-images` and `release-cli` failed on the `v0.1.0` tag (non-existent `trivy-action@0.29.0`; invalid `release-cli.yml`) — both fixed on `main`; no release artifacts exist for `v0.1.0`. `coder-template` fails without `CODER_URL`/`CODER_SESSION_TOKEN` secrets, by design until the lab environment exists.
- **Release workflows at `v0.1.2` (2026-10-04):** `release-cli` green on all three OS runners; release assets: `amo-linux-x64`, `amo-darwin-arm64`, `amo-windows-x64.exe` plus `SHA256SUMS-*.txt`, each smoke-tested (`rules validate` + sample `assess`) and attested. `publish-images` **blocked before push** by the scan gate (libpcre2-8-0 CVE-2026-103111, fixed in deb12u2) — the gate works; no lab image was published for `v0.1.2`. Fix: `apt-get upgrade` in the runtime stage. **Executed locally:** rebuilt lab image has `libpcre2-8-0 10.42-1+deb12u2`; `aquasec/trivy` (container) with `--severity HIGH,CRITICAL --ignore-unfixed` exits 0.
- **Release workflows at `v0.1.1` (2026-10-04):** `publish-images` built and pushed the lab image, then the Trivy scan failed on npm's vendored `sigstore` (CVE-2026-48815) in the Node base image — so a `v0.1.1` lab image exists in GHCR that did not pass the scan; do not deploy it. `release-cli` failed its smoke test because `./dist-sea/amo*` expanded to the binary plus build intermediates. Both fixed on `main` (`705c7cd`). **Executed locally (Windows, Docker Desktop 29.8):** `docker build` of `Dockerfile.lab` → health 200, no `npm`; `docker build` of the appliance `Dockerfile` from the two-tree context → core import resolves, rules present, API starts; `scripts/build-sea.sh` → `dist-sea/amo-windows-x64.exe` (99 MB) passes `rules validate` and a sample `assess`. **Not executed:** Trivy locally (CI runs it before pushing); Linux/macOS SEA builds (CI matrix); the workspace image.
- **Limitation:** `_App` pins `ADDON_REF` to a release tag of this repository (`v0.1.2` once cut); its CI is green against the sibling checkout.
## Not implemented

Execution beyond Resource Mover; Bicep/ARM mainTemplate for Marketplace; PDF/HTML reports; rate limiting at the API (recommended at Caddy); persistence of enterprise assessments; cost/capacity live checks (agent defined, returns unknown without authenticated APIs).

## How to complete runtime validation

1. `docker compose up --build` → open http://localhost:8080, run the sample, download the bundle, delete.
2. `terraform -chdir=infrastructure/terraform/demo-vps fmt -check && terraform init -backend=false && terraform validate`; same for `infrastructure/coder/template`; run `terraform validate` on a generated bundle's `terraform/` directory.
3. `pwsh -File scripts/package-repository.ps1`; `pwsh -Command "Invoke-ScriptAnalyzer <bundle>/scripts/powershell/Invoke-ArmMove.ps1"`.
4. Verify every rule URL and support state; re-snapshot.
5. Pin actions/images by SHA/digest; enable branch protection with `ci`, `security`, `iac-validate` as required checks.
6. Seed the GitHub Copilot review handshake PRs listed in `docs/governance/github-copilot-code-reviewer-pack-VALIDATION_REPORT.md`.

## Archive

`azure-migration-orchestrator.zip` — see the final section of the build log and `scripts/package-repository.sh`; files sit at the archive root; `.git`, `node_modules`, `dist`, `.local`, `.env`, state and caches excluded.
