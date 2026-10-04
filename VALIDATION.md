# VALIDATION.md

Web-front edition (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`, ADR-0028). Everything below distinguishes what was executed
from what was not. Engine, rule and UI validation lives upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App/VALIDATION.md`.

## Flip to the downstream edition (2026-10-04)

- **Environment:** Windows 11, Node 26.5, npm 11.17, Docker Desktop 29.8 (CI targets Node 22 — this run is not evidence for Node 22).
- **Executed:** see the section appended by the flip commit.

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
