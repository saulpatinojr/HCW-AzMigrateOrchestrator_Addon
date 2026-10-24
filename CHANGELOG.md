# Changelog

The engine, rules, CLI and UI components are versioned and released upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App`
(see its `CHANGELOG.md`, which also carries the history of the pre-split monorepo). This file tracks the web-front edition only.

## Unreleased — 0.3.1: the upstream packages are release tarballs pinned by URL and hash

- `docs/whats-new-upstream.md` (new): what changed upstream, whether it reaches this edition, and what to run, with a table of the pinned upstream state (2026-10-24: pin and latest release are both `v0.3.1`, and the pinned tarball hashes were checked against the published assets). `CLAUDE.md` points to it. `docs/adr/` gains ADR-0030 (copied from upstream, where it is now accepted) and its README no longer calls it pending; `docs/README.md` indexes the new file; the "first adoption is `v0.3.0`" limitation in `VALIDATION.md` and the "Tag `v0.3.0`" example in `docs/deployment/lab-host.md` are brought up to date. Documents only.
- Dependabot groups every GitHub Actions pin into one `all-actions` pull request (a lone `codeql-action/analyze` bump failed the CodeQL upload in #10; `init` and `analyze` must move together). `security.yml` moves both to v4.38.3 in one step, as the upstream repository did.
- `package.json` pins `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui` as the tarballs attached to the upstream GitHub Release of `v0.3.0`, by URL; `package-lock.json` carries their integrity hash, which `npm ci` verifies. The ADR-0028 interim contract is retired: no sibling checkout, no `APP_REF`, no `scripts/bootstrap-app.sh`, no `.npmrc` `install-links`; CI, the Copilot setup, `publish-images.yml`, `Dockerfile.lab` and `docker-compose.yml` build from this repository alone. `core-update.yml` bumps both URLs, re-locks and tests the edition against each new upstream release. The same release-asset method serves the Cloud Assessor and NetworkEyes pairs (ADR-0028 copy amended; upstream ADR-0030).
- `core-update.yml`'s checkout no longer persists credentials: two Authorization headers made GitHub answer `400` to `create-pull-request`'s push (reproduced twice in the upstream App's `rules-refresh`, fixed there in saulpatinojr/HCW-AzMigrateOrchestrator_App#24).
- README: a "try it in two minutes" paragraph for new visitors, a live badge for the pane, the upstream badge at v0.3.1, and the `core-update` description matches the tarball method.
- `coder-template.yml` runs only when the repository variable `CODER_TEMPLATE_ENABLED` is `true`; it fired on the grouped Actions pin bump (#15) and failed on the empty `CODER_URL` secret, since the lab host runs with the workspace provider disabled. A skipped job instead of a red run on `main`.
- `apps/lab-api/package.json` is 0.3.1 too: the API reports that file's version in `/api/health` and `x-addon-version`, and the `v0.3.1` image reported `0.3.0` because only the root and `apps/lab-web` were bumped. `tests/version-alignment.test.mjs` now fails the build when a workspace version differs from the root's. Takes effect with the next tag.
- Adopts upstream `v0.3.1` (`core-update` by hand, the scheduled run being hours away): the questionnaire keeps focus while typing (its field components were re-created on every keystroke), **Destination region** is a select over the Azure public regions with the export's own regions marked and an "Other" free-text fallback, every select carries labelled values, and the portal "All resources" export's RESOURCE LINK column now yields resource ids, so parent/child discovery works on the default export without a re-export. The e2e journey selects the region instead of typing it. Version 0.3.1.
- The pane adopts the `v0.3.0` explorer props: `partners={false}` replaces the interim CSS rule that hid the partner panel, and `contactPath` + `onNavigate` hand the contact link to the host instead of intercepting clicks.
- `infrastructure/coder/template/main.tf` (`amo-guided-lab`) is aligned to the lab host's ADR-0032 / LAB-5 sandbox boundary: `tcp://coder-docker-proxy:2375`, `user = "65534:65534"`, `HOME = "/tmp/home"` on a per-workspace named volume, isolated `coder-ws-<id>` bridge network, all Linux capabilities dropped (`no-new-privileges:true`), `module "code-server"` with `subdomain = true` (compatible with `CODER_DISABLE_PATH_APPS=true`), and `/usr/local/libexec/hcw-boot/hcw-boot migration-assessment` dispatch with `python3 -m zipfile -e` bundle extraction.
- Repository hygiene and security cleanup: removes the retired GHCR workspace image workflow (`.github/workflows/publish-workspace-image.yml`) and `infrastructure/coder/image/Dockerfile`, removes `docs/partners/` and `docs/adr/ADR-0019-lab-edge-cloudflare-tunnel-on-hostinger.md`, removes website-only Copilot skill files under `.github/skills/code-review/references/`, removes the broken `make app` target from `Makefile`, bumps `repository.manifest.json` to `0.3.1` (enforced by `tests/version-alignment.test.mjs`), adds `docs/deployment/appliance.md`, and closes CodeQL alert #7 (`js/incomplete-url-substring-sanitization`) in `tests/security/edition-boundary.test.mjs`.

## Unreleased — 0.3.0 (2026-10-10): the site frames the AddOn as a pane

Program decision (HCW AddOn Integration Standard; upstream ADR-0030 pending): hybridcloudworks.com no longer installs the
UI package. It frames `https://migration.lab.hybridcloudworks.com/` at `/tools/migration` in a sandboxed iframe, reads
`/api/health` through its status proxy, and hosts this AddOn's image on its lab host through its `addons` Ansible role.

- **Retired infrastructure deleted** (follow-up to the pane model): `infrastructure/terraform/lab-hostinger`, `infrastructure/terraform/lab-cloudflare`, `infrastructure/reverse-proxy` and `docs/deployment/vps.md` are gone; `iac-validate` covers the Coder template only; the partner notes, the infrastructure index, `VALIDATION.md` and `repository.manifest.json` no longer point at them. ADR-0019 remains as the record of the retired Tunnel edge.
- **Pane app `apps/lab-web`** (Vite + React, replaces the vanilla page and `apps/ui-harness`): mounts `MigrationExplorer`
  against the same origin, owns the human-verification widget (script injected only when health says it is required, token
  kept in memory), speaks the pane protocol (`{ type: 'hcw-addon', id: 'migration', state }` to the configured site origins,
  on transitions only: `loading → ready → working → ready`, `unavailable`), turns the enterprise CTA into a `navigate`
  request, shows the one unavailable sentence, uses the HCW theme tokens with `prefers-color-scheme`, and carries no vendor
  name in visitor copy. Interim until `APP_REF` v0.3.0: the partner panel is hidden with CSS and the sandboxed `confirm()`
  is bypassed when framed.
- **Lab API contract:** `AMO_FRAME_ANCESTORS` (CSP `frame-ancestors`; `X-Frame-Options: DENY` only for `'none'`),
  `AMO_SITE_ORIGINS`, `AMO_TRUST_PROXY` (first `X-Forwarded-For`; `CF-Connecting-IP` dropped), `AMO_RATE_LIMIT_POSTS` /
  `AMO_RATE_LIMIT_WINDOW_MINUTES` (token bucket → `429 rate_limited` + `Retry-After`), `AMO_MAX_CONCURRENT`
  (→ `503 overloaded` + `Retry-After: 5`), fail-closed human verification (`503 turnstile_not_configured` without a secret
  unless `AMO_ALLOW_NO_TURNSTILE=1`; a secret without `AMO_TURNSTILE_SITE_KEY` refuses to start), `AMO_TURNSTILE_SITEVERIFY_URL`,
  CSP `base-uri 'none'; form-action 'self'` and the verification origins only when a site key is set, `X-Addon-Id` /
  `X-Addon-Version` on every response, the flat `/api/health` envelope (`ok, id, version, edition, capabilities, asOf,
  siteOrigins, turnstile, …`), `index.html` `no-cache` and immutable `/assets`, `AMO_STATIC_DIR` default `apps/lab-web/dist`.
  `AMO_RULES_DIR` removed (rules ship in the core).
- **Tests:** API tests for each behaviour; the edition boundary now checks the pane app; the OpenAPI contract is two-way and
  the spec is complete (health schema, headers, 429/503); e2e runs one API serving the built pane plus a siteverify mock and a
  host page with the site's sandbox, asserting the journey, the exact message sequence, headers, 403 without a token, no
  password inputs, no partner names.
- **Image and CI:** the lab image builds the pane, is pinned to `node:26-bookworm-slim` by digest, carries OCI labels, and is
  published to `docker.io/hybridcloudworks/hcw-addon-migration` through the Docker OIDC connection (no registry secrets; the
  job is gated on `DOCKERHUB_ENABLED`); `docker-compose.lab.yml` (Cloudflare Tunnel) deleted; `docker-compose.yml` is local only;
  `iac-validate` no longer validates the retired Terraform.
- **Docs:** website integration rewritten for the pane model; `docs/deployment/lab-host.md` added (owner steps for the widget,
  the vault key and Docker Hub, health, logs, rollback by digest); `vps.md`, `infrastructure/terraform/lab-*` and
  `reverse-proxy` marked retired (deletion in a follow-up); threat model, runbook, README and indexes updated.
- **Review round 2 (Copilot, PR #4):** every numeric setting must be a safe integer between 1 and 1,000,000,000; a digit
  string long enough to become `Infinity` (which would have made a bucket, window or TTL unbounded) now refuses the start.
- **Cross-AddOn standardization (program Phase 5D):** every response also carries `Permissions-Policy: camera=(),
  microphone=(), geolocation=()` and `Cross-Origin-Opener-Policy: same-origin`, as the Python AddOns do; the generic error
  codes are `method_not_allowed` (405) and `internal_error` (500), shared by all three AddOns.
- **Review round 1 (Copilot, PR #4):** the fail-closed `503 turnstile_not_configured` answer goes out before the body is read
  and closes the connection behind it; a secret without `AMO_TURNSTILE_SITE_KEY` refuses to start unconditionally (the bypass
  flag covers only the no-secret case); `verifyTurnstile` is bounded to 5 s (abort signal plus a race, so a fetch that
  ignores the signal still ends) and a timeout is the failed verdict `siteverify-timeout`; the concurrency bound now counts a
  request from verification onwards, so a stalled verification endpoint cannot exhaust connections; `apps/lab-api/src/config.ts`
  builds the options from the environment and refuses to start on anything but positive integers for
  `AMO_RATE_LIMIT_POSTS`, `AMO_RATE_LIMIT_WINDOW_MINUTES`, `AMO_MAX_CONCURRENT` and the TTL (tests in `config.test.ts`);
  `docs/api/openapi.yaml` names the four AddOn headers as individual header components attached to every response
  (shared YAML anchor), and the contract test checks that.
- Versions: repository, `@amo/lab-api` and `@amo/lab-web` at 0.3.0.

## Unreleased — 2026-10-04 (ADR-0028 flip)

- README rewritten for the public repository: badges, relationship diagram, a "Connecting the website" section for the site repository review, release contract; `docs/README.md` and `infrastructure/README.md` indexes (experimental templates marked as such). GitHub description, homepage and topics set.
- Node 26 runtime floor (ADR-0029, coordinated with upstream): `engines.node >=26`, `@types/node ^26.6.4`, `setup-node 26` in every workflow, `node:26-bookworm-slim` in the lab image, Node 26 devcontainer.

- This repository became the **downstream web-front edition**: it now holds only the CSV lab API, the static harness, the
  browser e2e suite, lab infrastructure (Hostinger VPS, Cloudflare edge, Coder template) and the website-integration docs.
  The engine, rule corpus, CLI and UI components moved upstream and are consumed as `@hybridcloudworks/migration-core` and
  `@hybridcloudworks/migration-ui` (interim: `file:` links to the sibling upstream checkout at `APP_REF`).
- `core-update.yml`: watches upstream releases, tests this edition against each (unit + Playwright) and opens a `compatible` /
  `needs-adaptation` pull request bumping `APP_REF`; optional auto-merge via the `CORE_AUTOMERGE` variable.
- `edition-boundary` test rewritten: workspaces depend only on the two published packages plus React; the installed core
  exposes no Azure client subpath and contains no Azure endpoint.
- Lab image is now the two-tree build (upstream packages + this edition); runtime image drops npm and applies Debian upgrades;
  publication scans before pushing.
- `.npmrc` `install-links=true`: the interim `file:` links are packed and installed like registry packages, so their dependencies (Radix) install and nothing from the upstream tree is needed at runtime; the lab image no longer copies the upstream directory.
- Tags `v0.1.0`–`v0.1.3` of this repository predate the flip (they released the former core from here) and are historical.
