# Changelog

> **Repository split (2026-10-04, ADR-0027).** This file predates the split of the monorepo into `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` and `saulpatinojr/HCW-AzMigrateOrchestrator_App`. This repository (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`) holds the shared core, rules, CLI, lab API, lab web harness and the UI package. Entries below describe the monorepo as it was; paths that moved to the sibling repository are noted there.

## Unreleased — 2026-10-04 (Phase 1 of WORKING-PLAN.md)

- ADR-0027: publish as two public repositories — `saulpatinojr/HCW-AzMigrateOrchestrator_App` (appliance) and `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` (lab, UI package, shared core). ADR-0017 cross-linked; `WORKING-PLAN.md` hosting table and Phases 1–2 updated; package names `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui`.
- `publish-images.yml`: lab matrix entry referenced itself; now `infrastructure/docker/Dockerfile.lab`.
- `packages/contracts`: the questionnaire credential filter rejected `applicationGroupTagKey`; `key` is now blocked except as the `…TagKey` suffix. Tests cover both directions.
- Obsolete `hcw-architect` owner/image/clone references replaced with `saulpatinojr` (CODEOWNERS, compose, Coder, Terraform defaults, deployment docs); website integration guide installs the published package at an exact version or an `_Addon` release tag.
- `.gitignore`: `*.tfplan`.
- Repository trees built (ADR-0027): `HCW-AzMigrateOrchestrator_Addon` (core, rules, CLI, lab, UI package; 316 files) and `HCW-AzMigrateOrchestrator_App` (appliance; 133 files) generated as siblings of the monorepo, each with its own workspaces, lockfile, CI, CODEOWNERS, manifest and packaging. `packages/azure-discovery` reduced to the interface in `_Addon`; its Resource Graph, validate-move and scope clients became `packages/azure-arm` in `_App`; `apps/appliance-api` imports updated. `_App` links the core via `file:` to the sibling checkout, pinned in CI at `ADDON_REF=v0.1.0`.
- Boundary tests: `_Addon` `edition-boundary` now forbids any dependency on `@amo/azure-auth`, `@amo/azure-arm`, `@amo/azure-execution` or `@azure/*` and checks the interface package has no Azure endpoint or auth import; `_App` adds `appliance-boundary`.
- Coder template HCL: two single-line blocks used `;`; fixed, `terraform fmt` applied, `terraform validate` passes.
- `scripts/package-repository.ps1`: excluded every file (array element parsed as a bare `# Changelog
- `v0.1.3`: first fully verified release — lab image published after passing the scan gate (`ghcr.io/saulpatinojr/azure-migration-orchestrator-lab@sha256:e5aa04aa524e35811ebcc565348f80c72207f1a80de81679eb3ddd73b3e24c47`), CLI binaries for three platforms with checksums and provenance.
- `v0.1.2`: `release-cli` published `amo-linux-x64`, `amo-darwin-arm64`, `amo-windows-x64.exe` with checksums and provenance; `publish-images` refused to push because the Trivy gate found a fixed HIGH CVE in the Debian base image (`libpcre2-8-0`, CVE-2026-103111). The lab runtime stage now runs `apt-get upgrade` so base-image security fixes are applied at build time; a local Trivy scan of the rebuilt image is clean.
- Release workflows (after `v0.1.1` failed): `publish-images.yml` now builds locally, scans with Trivy, and only then pushes with provenance and SBOM, so a failing scan publishes nothing; the lab runtime image drops the bundled `npm`/`npx`/`corepack` (the `v0.1.1` scan flagged npm's vendored `sigstore`, CVE-2026-48815); `tsc -b --force` inside the image so stale `*.tsbuildinfo` can never suppress emission. The Coder workspace image moved to the manual `publish-workspace-image.yml` while Coder stays disabled. `build-sea.sh` names binaries `amo-<os>-<arch>[.exe]`, writes `SHA256SUMS-<os>-<arch>.txt` and removes intermediates; `release-cli.yml` smoke-tests the one binary (`rules validate` and a sample `assess`), uploads binaries plus checksums, and no longer cancels sibling OS jobs.
- First CI run after publication: `aquasecurity/trivy-action@0.29.0` never existed (tags are v-prefixed from v0.30.0); every action is now pinned to a full commit SHA with the version in a trailing comment. `release-cli.yml` was an invalid workflow file (unquoted `${{ matrix.os }}` inside a flow mapping); rewritten in block style. The Terraform generator emitted an invalid single-line `variable "location"` block when a destination region was set; root module calls now pass through every variable a module references and each module declares them (previously `terraform validate` failed with "Missing required argument" for NIC, image and service-plan ids and `ssh_public_key`); `terraform init`/`validate` of generated bundles pass for region relocation and cross-tenant (root and hcp; provider deprecation warnings only). Golden `terraform__main.tf` regenerated deliberately for the added arguments. The Playwright harness server binds 127.0.0.1 and is awaited by URL (Linux runners resolve `localhost` to ::1).

> **Repository split (2026-10-04, ADR-0027).** This file predates the split of the monorepo into `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` and `saulpatinojr/HCW-AzMigrateOrchestrator_App`. This repository (`saulpatinojr/HCW-AzMigrateOrchestrator_Addon`) holds the shared core, rules, CLI, lab API, lab web harness and the UI package. Entries below describe the monorepo as it was; paths that moved to the sibling repository are noted there.

## Unreleased — 2026-10-04 (Phase 1 of WORKING-PLAN.md)

- ADR-0027: publish as two public repositories — `saulpatinojr/HCW-AzMigrateOrchestrator_App` (appliance) and `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` (lab, UI package, shared core). ADR-0017 cross-linked; `WORKING-PLAN.md` hosting table and Phases 1–2 updated; package names `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui`.
- `publish-images.yml`: lab matrix entry referenced itself; now `infrastructure/docker/Dockerfile.lab`.
- `packages/contracts`: the questionnaire credential filter rejected `applicationGroupTagKey`; `key` is now blocked except as the `…TagKey` suffix. Tests cover both directions.
- Obsolete `hcw-architect` owner/image/clone references replaced with `saulpatinojr` (CODEOWNERS, compose, Coder, Terraform defaults, deployment docs); website integration guide installs the published package at an exact version or an `_Addon` release tag.
 regex) and `Compress-Archive` failed on dotfiles; rewritten on `System.IO.Compression` with a built-in leak check. Verified in all three trees.

## 0.8.0 — 2026-10-03 (Sprint 7 — operations and e2e)

- `apps/worker`: polls Azure long-running operations recorded by the API (Resource Mover), persists status, audits completion; `GET /api/operations/{targetKey}`; `operations` table; worker Container App and compose service (ADR-0026).
- Compiled Tailwind 4 (`@tailwindcss/vite`, `@source` on `packages/ui`) for `apps/appliance-web`; play CDN removed; MSAL/React manual chunks.
- `apps/ui-harness`: lazy-island host for `@amo/ui` mirroring the site integration.
- Playwright e2e (`tests/e2e/lab.spec.ts`) through the harness against the real lab API; CI job `e2e`.

## 0.7.0 — 2026-10-03 (Sprint 6 — appliance depth)

- `ScopeInventory`: subscriptions across home tenant and Lighthouse delegations; `GET /api/scopes`; cross-tenant intent derived from subscription directories (ADR-0025).
- PostgreSQL Entra authentication: `pg` password provider exchanging the appliance credential for a database token; password-bearing URLs refused for Azure hosts.
- `apps/appliance-web`: Vite + React + MSAL (PKCE) UI reusing `@amo/ui` — scopes, assessments, validate-move, approvals, Resource Mover actions with gate reasons. Built in CI.

## 0.6.0 — 2026-10-03 (Sprint 5 — reach)

- Single-executable `amo` CLI (Node SEA + esbuild) with the rule corpus embedded; `release-cli.yml` for Linux/macOS/Windows with provenance (ADR-0024).
- `amo rules coverage`; `GET /api/rules/coverage`; `docs/rules/coverage.md` generator.
- Opt-in aggregate telemetry (`AMO_TELEMETRY=1`, `GET /api/stats`) — counts only, tested to exclude identifiers.
- First organizational overlay: `rules/organization/hcw-standards.json` (Storage Mover over AzCopy); snapshot 1.0.35.
- `docs/product/marketplace-evaluation.md`.

## 0.5.0 — 2026-10-03 (Sprint 4 — guided lab)

- `lab-api`: `POST /api/assessments/{id}/workspace` creates a Coder workspace via the provider abstraction; one-time 10-minute bundle tokens (`x-bundle-token`) for the workspace download; feature hidden when no provider is configured (ADR-0023).
- `packages/ui`: "Open in Coder (guided lab)" shown only when `/api/health` reports a workspace provider.
- Coder template parameters (`assessment_id`, `bundle_token`, `api_base_url`), workspace image Dockerfile, `coder-template.yml` push workflow; workspace image added to `publish-images.yml`.

## 0.4.0 — 2026-10-03 (Sprint 3 — appliance)

- `@amo/azure-auth`: dependency-free Entra token validation (JWKS/RS256) and credentials (Azure CLI, managed identity, workload identity federation); client secrets rejected.
- `@amo/azure-discovery`: Resource Graph REST provider (paged, 403 → permission gap) and ARM `validateMoveResources` evidence.
- `@amo/azure-execution`: Resource Mover client with gated prepare/initiateMove/commit/discard.
- `apps/appliance-api`: token-validated routes, assessments by scope, validate-move, approvals, execution, audit; repository with in-memory and PostgreSQL (`pg`) implementations (Entra-only DB auth).
- `infrastructure/terraform/appliance-azure`: Container Apps, user-assigned identity, PostgreSQL Flexible Server (private, Entra-only), Log Analytics/App Insights, Entra app registration with app roles.
- `Dockerfile.appliance`; `publish-images.yml` publishes lab and appliance images with provenance + SBOM.

## 0.3.0 — 2026-10-03 (Sprint 2 — HashiCorp depth)

- `terraform/state-impact/`: `removed` + `import` blocks and `state-mv.sh` for ID changes caused by ARM moves / Resource Mover (ADR-0020).
- `terraform/hcp/`: HCP Terraform workspace (VCS-driven, manual apply, workload identity federation) and cloud block example.
- `argument-manifest.json` + schema check (`terraform providers schema -json` or Terraform MCP adapter); CI validates the golden bundle with the real `azurerm` provider.
- Learn move-support parser + diff, `scripts/refresh-rules-from-learn.mjs`, weekly `rules-refresh.yml` opening a report PR (ADR-0021).
- Questionnaire: optional destination subscription / resource group for exact new-ID computation.

## 0.2.0 — 2026-10-03 (Sprint 1)

- Apps renamed by deployable: `lab-api`, `lab-web` (harness), `appliance-api`; edition boundary frozen by test (ADR-0017).
- `packages/ui`: React 19 components (Radix Dialog/Tabs, Tailwind classes) for the content site; `LabApiClient`; partner panel.
- Per-operation confidence on every decision (ADR-0018).
- `lab-api`: exact-origin CORS, Cloudflare Turnstile verification, `cf-connecting-ip` handling.
- Edge: Cloudflare Tunnel replaces Caddy; VPS opens no inbound ports (ADR-0019). Terraform for Hostinger VPS and Cloudflare edge.
- GHCR publish workflow with SLSA provenance + SBOM + image scan; `copilot-setup-steps.yml`.
- Partner one-pagers and site integration guide.

## 0.1.0 — 2026-10-03

Initial build of the shared migration intelligence core, demo edition (CLI, API, static UI), enterprise API skeleton,
34 versioned rules, 19 agent definitions with deterministic orchestration and Safety Agent, output bundle generators,
VPS/Docker/Coder infrastructure, GitHub Copilot review pack, 51 automated tests. Limitations in `VALIDATION.md`.
