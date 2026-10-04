# ADR-0028: The appliance is the upstream product; the web-front edition consumes published packages

**Status:** Accepted · **Date:** 2026-10-04 · **Supersedes the repository table of ADR-0027 and the split direction of ADR-0017**

## Context

ADR-0027 split the monorepo so that the engine lived with the lab (`_Addon`) and the appliance (`_App`) consumed it at a
pinned ref. The owner's product model is the reverse: the **appliance is the core product and must be freestanding**; the
web-front addon is a **minimal, slim edition of the appliance** that is also freestanding, and **updates flow downstream**
from the appliance to the addon "if compatible". Under ADR-0027 the appliance could not build without the addon repository
and engine changes had to be developed in the addon. Both repositories were a day old with no external consumers, so the
layout was flipped at zero migration cost.

## Decision

| Repository | Holds | Publishes |
|---|---|---|
| `saulpatinojr/HCW-AzMigrateOrchestrator_App` (**upstream**) | The engine (`packages/*`: taxonomy, contracts, csv-ingestion, evidence/rules, classification, agents, report/Terraform/runbook/artifact generators, authorization, workspace-provider, the `DiscoveryProvider` interface), the rule corpus and its refresh workflow, the `amo` CLI, the explorer UI components (`packages/ui`), **and** the appliance layer (`azure-auth`, `azure-arm`, `azure-execution`, `appliance-api`, `appliance-web`, `worker`, Container Apps Terraform). Canonical ADR log and `WORKING-PLAN.md`. Builds and runs alone. | `@hybridcloudworks/migration-core` (engine as subpath exports + rules), `@hybridcloudworks/migration-ui` (components), CLI release binaries, appliance image |
| `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` (**downstream**) | The CSV lab API, static harness, Playwright e2e, Hostinger/Cloudflare Terraform, Coder template, website-integration and partner docs. Depends on exact versions of the two published packages and on nothing else upstream. | Lab image, Coder workspace image (manual) |

1. **Packaging.** `scripts/assemble-packages.mjs` builds the two packages from the compiled workspaces: every engine package
   becomes a subpath export (`@hybridcloudworks/migration-core/agents`, `/domain`, …) with intra-package imports rewritten to
   relative paths, the rule corpus ships under `rules/`, and `defaultRulesDir()` resolves it package-relatively so consumers
   need no configuration. The UI package references the core for **types only**; it has no runtime core import.
   `tests/packaging` asserts the shape; `scripts/verify-packed-consumer.mjs` (CI job `packed-consumer`) packs both, installs
   them from tarballs into an empty project, runs an assessment and type-checks a consumer.
2. **Boundary (ADR-0008 preserved).** `azure-auth`, `azure-arm` and `azure-execution` are never published; the core's
   `azure-discovery` subpath is the interface and fixture provider only. `_App` tests assert the published exports exclude
   them; `_Addon` tests assert its installed core exposes no Azure subpath and that its apps never reference them.
3. **Downstream flow ("symbiosis").** An `_App` release is the trigger. In `_Addon`, `.github/workflows/core-update.yml`
   (every six hours and on demand) compares the latest `_App` release with the pinned `APP_REF`; when it differs it checks
   out the new release, builds it, installs it, runs the addon's unit tests **and** the browser e2e suite, and opens a pull
   request bumping `APP_REF` whose body carries the result and whose label is `compatible` or `needs-adaptation`.
   "If compatible" therefore means: the addon's own test suite passes against the new core. A compatible PR auto-merges only
   when the repository variable `CORE_AUTOMERGE=true`; otherwise a human merges. Once the packages are on npm, Dependabot's
   `npm` ecosystem proposes the same bumps as ordinary dependency updates and the interim workflow becomes redundant.
4. **Interim contract until the npm release.** `_Addon` links the packages with `file:../HCW-AzMigrateOrchestrator_App/dist-packages/<pkg>`;
   CI, the lab image build and `scripts/bootstrap-app.sh` check out `_App` at `APP_REF` (a release tag, never `main`) as a
   sibling and build it first. `vite`/`tsc` in the harness use `preserveSymlinks` so the linked UI package resolves its
   dependencies from the addon tree. Phase 2 of the working plan replaces the links with exact npm versions.
5. **Publication.** `publish-npm.yml` uses npm trusted publishing (OIDC, provenance; no stored token) and is gated on the
   repository variable `NPM_TRUSTED_PUBLISHING=ready`, set by the owner after the one-time registry bootstrap in
   `docs/release/npm-publishing.md`. Image publication scans before pushing (ADR-0027 release fixes carried over).

## Consequences

- The appliance is freestanding: `npm ci && npm test` in `_App` needs nothing else. The addon is freestanding in deployment
  (its own image, infra, API) and depends on published, versioned artifacts only.
- Engine, rule and UI work happens upstream; the addon only adapts when a bump proves incompatible.
- `_Addon` tags `v0.1.0`–`v0.1.3` predate the flip and are historical; `_App` releases start at `v0.2.0`.
- The two Dockerfiles swap roles: the appliance image is a single-repository build again; the lab image is the two-tree build.
- Website integration installs `@hybridcloudworks/migration-ui` from npm at an exact version once published; until then it
  cannot consume the package (a git dependency cannot deliver an assembled sub-directory), so Phase 3 waits on the bootstrap.
