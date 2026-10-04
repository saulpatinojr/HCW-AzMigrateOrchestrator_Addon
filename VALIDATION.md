# VALIDATION.md

Web-front edition (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`, ADR-0028). Everything below distinguishes what was executed
from what was not. Engine, rule and UI validation lives upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App/VALIDATION.md`.

## Flip to the downstream edition (2026-10-04)

- **Environment:** Windows 11, Node 26.5, npm 11.17, Docker Desktop 29.8 (CI targets Node 22 — this run is not evidence for Node 22).
- **Executed:** tree rebuilt from the post-split repositories with imports rewritten to the published packages; `.npmrc` `install-links=true` so the `file:` links are packed and installed like registry packages (their own dependencies included); `npm install` (new lockfile) and `npm ci` clean; `npm test` — **15 pass, 0 fail** (lab API, OpenAPI contract, manifest, no-secrets, rewritten `edition-boundary` against the installed core); harness `vite build` — chunk hashes identical to the pre-flip harness build; `docker build` of `Dockerfile.lab` from the two-tree context → nothing from the upstream tree at runtime, rules found inside `migration-core`, health 200, sample served, no `npm`, containerised Trivy (HIGH/CRITICAL, fixed only) exit 0; all 8 workflow files parse and every action is SHA-pinned; `terraform fmt -check` clean; PowerShell packaging 139 files, no leak.
- **Not executed locally:** Playwright e2e (CI job `e2e`; the first CI attempt failed because npm does not install a symlinked package's dependencies — fixed by `install-links`); `core-update.yml` end to end (no newer upstream release exists yet; trigger it manually with `workflow_dispatch` to rehearse).

## Node 26 runtime floor (2026-10-04, ADR-0029)

- **Executed (Node 26.5 locally):** `npm install` against the upstream packages declaring `engines.node >=26`; `npm test` — 15 pass; harness `vite build`; `docker build` of `Dockerfile.lab` on `node:26-bookworm-slim` → Node 26 at runtime, health 200, containerised Trivy (HIGH/CRITICAL, fixed only) exit 0; workflows parse with `setup-node 26`.
- **Not executed locally:** GitHub-hosted runners on Node 26 and the Playwright e2e (CI); the devcontainer image pull.

## Standing limitations

- Interim dependency contract: a stale sibling upstream build silently yields stale types and runtime. Run `npm run app:bootstrap`
  after any `APP_REF` change. Removed once the packages are installed from npm.
- `core-update` pull requests are opened with `GITHUB_TOKEN`, so they do not trigger the `ci` workflow themselves; the
  compatibility evidence is the `core-update` run linked in the PR body.
- Playwright e2e runs on GitHub-hosted runners only (browser download is blocked in the authoring sandbox).
- `terraform init/validate` for `lab-hostinger` and `lab-cloudflare` runs in CI (`iac-validate`); the Hostinger provider
  resource names remain marked [VERIFY] in the templates.
- Turnstile against the real siteverify endpoint, Cloudflare Tunnel end to end, Coder workspace creation against a live
  deployment and the workspace image build were not executed.
