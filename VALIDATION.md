# VALIDATION.md

Web-front edition (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`, ADR-0028). Everything below distinguishes what was executed
from what was not. Engine, rule and UI validation lives upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App/VALIDATION.md`.

## Pane model, 0.3.0 (2026-10-10)

- **Environment:** Linux authoring sandbox, Node 26.11.1 (a local `node@26` on PATH, never system-wide), npm 10.9.4, the sibling
  upstream at `APP_REF` v0.2.1 built and assembled; no Docker daemon.
- **Executed:** `npm run typecheck` (API project and the pane's `tsc -p apps/lab-web/tsconfig.json`); `npm test` — **23 pass,
  0 fail** (13 API tests including framing default vs configured, the flat health envelope, `x-addon-*` on JSON/static/error
  responses, rate limit 429 with `Retry-After` shared by the workspace route, overload 503 with `maxConcurrent: 0`,
  fail-closed verification 503 and the allow flag, start-up refusal without a site key, trust-proxy address selection,
  cache-control per path; 3 two-way OpenAPI contract tests; 4 edition-boundary tests; manifest; no-secrets); `npm run build`
  (API + pane, `apps/lab-web/dist`); **`npm run e2e` — 5 pass** on Chromium 153 (`npx playwright install chromium` succeeded
  here): the journey through the pane, the exact message sequence `loading → ready → working → ready` on a host page with
  the site's sandbox (four messages, none on re-render) plus delete through the sandbox, headers (`frame-ancestors` from env,
  no `x-frame-options`, `x-addon-*`), 403 without a verification token with the explorer's alert, no password inputs, no
  partner or vendor names; a smoke run of `apps/lab-api/dist/server.js` with `AMO_STATIC_DIR=apps/lab-web/dist
  AMO_ALLOW_NO_TURNSTILE=1 AMO_FRAME_ANCESTORS="'self' https://hybridcloudworks.com"`: health answers the flat envelope,
  `/` is `no-cache` with the configured `frame-ancestors` and no `x-frame-options`, `/assets/*` is immutable, the start-up
  warning names the allow flag; all workflow files parse; the `node:26-bookworm-slim` index digest was resolved from Docker
  Hub (`sha256:86f07bc9…`) and is the pin in `Dockerfile.lab` (marked [VERIFY] for the first production publish).
- **Review round 1 (Copilot, PR #4, 2026-10-10), same environment:** `npm run typecheck`; `npm test` — **26 pass, 0 fail**
  (the 23 above plus: the fail-closed 503 is answered before the body is read, with `connection: close`, and a 6 MB upload
  against it is cut or answered within the bound; a secret without a site key refuses to start even with the bypass flag;
  a stalled verification endpoint yields `403 siteverify-timeout` within the bound, holds one of the `maxConcurrent`
  slots so a second request gets `503 overloaded`, and a fetch that ignores the abort signal still times out — in
  `api.test.ts`; `config.test.ts` covers the environment mapping and the refusal of `0`, negative, fractional and
  non-numeric `AMO_RATE_LIMIT_POSTS`, `AMO_RATE_LIMIT_WINDOW_MINUTES`, `AMO_MAX_CONCURRENT` and TTL values; the contract test
  checks that every documented response carries the four AddOn header components); `npm run e2e` — **5 pass**;
  `docs/api/openapi.yaml` parses as YAML (PyYAML) with the shared `addon_headers` anchor resolving on all 26 responses.
- **Not executed locally (CI only):** `docker build` of `Dockerfile.lab` and the Trivy scan (no daemon); `publish-images.yml`
  against Docker Hub (the OIDC connection and the `DOCKERHUB_*` variables are owner steps); the website's `addons` role,
  Caddy route and status proxy (Phase 6, website repository); verification against the real siteverify endpoint.
- **Interim until `APP_REF` reaches upstream v0.3.0** (`MigrationExplorer` gains `partners`, `cta`, `onStageChange`,
  `onNavigate`, `apiBaseUrl` default `""`): the pane hides the explorer's partner panel with CSS (`[aria-label="Powered by"]`),
  turns the in-frame `/contact` CTA link into a `navigate` request with a capture-phase click handler, derives `working`/`ready`
  from a `fetchImpl` wrapper around the explorer's POSTs rather than from stage changes, and bypasses `window.confirm` when
  framed: the site's sandbox has no `allow-modals`, so the browser ignores the explorer's `confirm()` (`Ignored call to
  'confirm()'. The document is sandboxed, and the 'allow-modals' keyword is not set.`, observed in e2e) and "Delete my data
  now" would otherwise do nothing. The UI package should confirm deletion without a modal; `partners={false}`,
  `onNavigate` and `onStageChange` replace the first three shims at adoption.
- **Known limitation:** `unavailable` cannot be posted when health itself fails, because the site origins come from health;
  the site's 30-second watchdog shows its own sentence, and the pane shows the same sentence in-frame.

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
- Playwright e2e ran locally on 2026-10-10 (Chromium downloaded) and on GitHub-hosted runners; earlier sandboxes blocked the download.
- `infrastructure/terraform/lab-hostinger` and `lab-cloudflare` are retired (2026-10-10) and no longer validated by
  `iac-validate`; they are deleted in a follow-up pull request.
- Human verification against the real siteverify endpoint, the website's `addons` role on the live host, Coder workspace
  creation against a live deployment and the workspace image build were not executed.
