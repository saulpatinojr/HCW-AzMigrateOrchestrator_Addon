# ADR-0027: Two public repositories — `_App` (appliance) and `_Addon` (lab, UI package, core)

**Status:** Accepted · **Date:** 2026-10-04 · **Supersedes the single-monorepo assumption in `WORKING-PLAN.md`; refines ADR-0017**

## Context

ADR-0017 planned an eventual split of the appliance from the lab once the core was published as a package. On 2026-10-04
the owner created two empty public repositories under `saulpatinojr` and decided to perform the split at first publication
rather than later: `HCW-AzMigrateOrchestrator_App` is the appliance; `HCW-AzMigrateOrchestrator_Addon` is the lab and the UI
package. The local workspace has one commit and tracks only `README.md`, so there is no history to rewrite — the split is
file placement into two first commits, not two `git filter-repo` runs.

## Decision

| Repository | Holds | Publishes |
|---|---|---|
| `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` | Shared core: every `packages/*` except `azure-auth`, `azure-arm`, `azure-execution` — including `packages/azure-discovery` reduced to the `DiscoveryProvider` **interface**, fixture provider, placeholder and demo guard; `rules/`; `apps/cli`, `apps/lab-api`, `apps/lab-web`, `apps/ui-harness`; `packages/ui`; `infrastructure/docker/Dockerfile.lab`, `infrastructure/terraform/lab-*`, `infrastructure/coder`; `docs/` including the canonical ADR log, `WORKING-PLAN.md`, partner and website-integration docs; `tests/e2e/lab.spec.ts`, `tests/security/edition-boundary.test.mjs` | `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui` (npm, trusted publishing); lab and lab-workspace images (GHCR); CLI release assets |
| `saulpatinojr/HCW-AzMigrateOrchestrator_App` | `apps/appliance-api`, `apps/appliance-web`, `apps/worker`; `packages/azure-auth`, **`packages/azure-arm`** (new: the Resource Graph, ARM `validateMoveResources` and scope-inventory clients formerly inside `azure-discovery`), `packages/azure-execution`; `infrastructure/docker/Dockerfile.appliance`, `docker-compose.appliance.yml`, `infrastructure/terraform/appliance-azure` and the planned `appliance-project` root; `docs/deployment/enterprise.md` and copies of appliance-relevant ADRs | Appliance image (GHCR) |

1. **The core lives with the lab.** `packages/authorization`, `observability`, `workspace-provider`, `contracts` and the
   engine packages are consumed by both sides and stay in `_Addon`, published as `@hybridcloudworks/migration-core`. `_App`
   consumes `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui` at exact pinned versions. Confirm the
   `@hybridcloudworks` npm scope is available before Phase 2 (`WORKING-PLAN.md`).
   The one refactor the split required: `packages/agents` imports the `DiscoveryProvider` interface and the demo guard, so
   `azure-discovery` could not leave the core wholesale. Its interface stays in `_Addon` with no dependency beyond
   `@amo/domain`; its three Azure-touching modules became `@amo/azure-arm` in `_App`, which depends on the interface package.
   `apps/appliance-api` imports changed accordingly; no other source changed.
2. **Interim dependency before the npm release.** A git dependency cannot deliver npm workspaces, so the interim contract is
   a *sibling checkout*: `_App/package.json` links every core package with `file:../HCW-AzMigrateOrchestrator_Addon/packages/<name>`;
   CI and the image build check out `_Addon` at `ADDON_REF` (a release tag, initially `v0.1.0`, never `main`) next to `_App`;
   `scripts/bootstrap-addon.sh` does the same locally; the rule corpus is reached through `AMO_RULES_DIR` (default
   `../HCW-AzMigrateOrchestrator_Addon/rules`, `/srv/HCW-AzMigrateOrchestrator_Addon/rules` in the image). The appliance
   Dockerfile's build context is the parent directory holding both checkouts. No submodule is used. Phase 2 replaces the
   links with exact npm versions and removes the two-tree build.
3. **Boundary tests change direction.** In `_Addon`, `tests/security/edition-boundary.test.mjs` asserts that no workspace
   depends on `@amo/azure-auth`, `@amo/azure-arm`, `@amo/azure-execution` or `@azure/*`, that `@amo/azure-discovery` has no
   Azure endpoint, network call or auth import, and that the appliance apps and Azure packages are absent. `_App` has
   `tests/security/appliance-boundary.test.mjs`: no lab apps, no CSV-ingestion or Turnstile code in the appliance, the Azure
   packages present, the interface package absent, and token validation plus a 401 path in the API.
4. **Rollout order.** `_Addon` is published first because `_App` depends on it and not vice versa. Each repository passes the
   Phase 1 content audit before its first push; both repositories are already public.
5. **Ownership.** Both repositories are under the personal account `saulpatinojr`, not the `HybridCloudWorks` organization
   named in the earlier plan. GHCR and npm namespaces follow the actual owner. Transfer to the organization is a separate
   decision and is not assumed by this ADR.

## Consequences

- `WORKING-PLAN.md` hosting table, Phase 1 and Phase 2 are updated to two repositories; per-repository CI, CODEOWNERS,
  Dependabot, CodeQL and release workflows are needed in each.
- The appliance cannot build until the core and UI packages (or an interim release tag) exist; Phase 2 therefore adds
  `@hybridcloudworks/migration-core` beside `migration-ui`.
- The version-pinning rule from ADR-0017 is unchanged: deployments reference immutable image digests and exact package
  versions, never `latest` or a branch.
- `repository.manifest.json` and `scripts/package-repository.*` are per-repository after the split and must be regenerated
  for each.
- Execution record: both trees were generated on 2026-10-04 by copying from the monorepo working tree
  (`C:\Users\saulp\Workspace\HCW-AzMigrateOrchestrator`, one commit, nothing pushed) into sibling directories
  `HCW-AzMigrateOrchestrator_Addon` and `HCW-AzMigrateOrchestrator_App`, each `git init`-ed with no commits. The monorepo is
  the archive of record until each repository's first push; after that it is retired. Verification is in each tree's
  `VALIDATION.md`.
