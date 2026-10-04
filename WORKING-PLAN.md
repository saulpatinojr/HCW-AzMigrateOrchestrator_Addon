# Working plan: public migration project, website integration, and Azure appliance

Status: agreed direction; Phase 1 in progress (nothing pushed yet).  
Created: 2026-10-03. Updated: 2026-10-04 (two-repository layout, ADR-0027).  
Owner: HybridCloudWorks.  
Update this checklist as work is verified. Move completed-work summaries to `CHANGELOG.md`, record limitations in `VALIDATION.md`, and link open work to GitHub issues once the repository is published.

## Objective and agreed decisions

Publish this project as two public repositories (ADR-0027) that together support an explorer embedded in the existing HybridCloudWorks website and an independently deployable Azure appliance. Treat the first release as a read-only project/reference implementation with documented limitations.

The owner selected:

- Split at first publication: `saulpatinojr/HCW-AzMigrateOrchestrator_App` is the appliance; `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` is the lab, the UI package and the shared core (decided 2026-10-04; both repositories exist, are public and are empty).
- Reuse the existing Hostinger VPS for the public lab API.
- Start the Azure appliance with authenticated read-only assessment.
- Keep appliance assessments session-only; no durable database initially.
- Target $25–$75 in incremental monthly hosting spend.

The existing website is https://hybridcloudworks.com and its repository is https://github.com/HybridCloudWorks/HCW-HybridCloudWorks.

## Hosting and ownership

| Component | Home | Source of truth |
| --- | --- | --- |
| Shared core packages, rules, CLI, lab API, lab web harness, UI package, lab Terraform, Coder template, partner and website-integration docs | Public `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` | `_Addon` repository |
| Appliance API, appliance web, worker, `azure-*` packages, appliance Terraform, appliance deployment docs | Public `saulpatinojr/HCW-AzMigrateOrchestrator_App` | `_App` repository |
| Website pages and embedded React explorer | Existing Azure Static Web Apps website | Website repository |
| CSV lab API | Existing Hostinger VPS, behind host-native Caddy | API image from `_Addon`; host configuration in website repository |
| Authenticated appliance UI and API | One Azure Container App, same origin | `_App` repository |
| Lab image | Public GitHub Container Registry (GHCR) | Versioned releases from `_Addon` |
| Appliance image | Public GHCR | Versioned releases from `_App` |
| Reusable core and explorer packages | Public npm registry, proposed `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui` | `_Addon` repository |
| CLI downloads | GitHub Releases | `_Addon` repository |
| Appliance infrastructure state | Dedicated HCP Terraform workspace | `_App` repository's project Terraform root |
| Existing VPS, wildcard lab DNS, host configuration | Existing HCP Terraform and Ansible configuration | Website repository |

Keep the website separate from both repositories. `_App` consumes `_Addon` only through exact pinned package versions (interim: a pinned `_Addon` release tag, never `main`). Do not copy the migration codebase into the website, install either repository from `main`, or use a submodule as the release mechanism. `_Addon` is published and released before `_App` because the dependency runs one way (ADR-0027).

The website's documented Hostinger setup uses Ansible, Docker, Caddy, and Coder. Follow that model. Do not apply this project's standalone VPS or Cloudflare Tunnel templates to that existing host. Terraform must have one owner for each resource.

## Phase 1 — Prepare the initial public repositories

- [x] Decide the repository split and record it: `_App` = appliance, `_Addon` = lab + UI package + shared core (ADR-0027, 2026-10-04).
- [x] Partition the local workspace into the two repositories per the ADR-0027 table (2026-10-04): sibling directories `HCW-AzMigrateOrchestrator_Addon` and `HCW-AzMigrateOrchestrator_App`, each with its own `package.json` workspaces, lockfile, `tsconfig.build.json`, CI, CODEOWNERS, Dependabot, CodeQL, `repository.manifest.json` and packaging scripts. `azure-discovery` was reduced to the interface in `_Addon`; its Azure clients became `packages/azure-arm` in `_App`. `_App` consumes the core through `file:` links to the sibling checkout, which CI pins at `ADDON_REF=v0.1.0` (that tag does not exist yet, so `_App` CI stays red until `_Addon` is pushed and tagged).
- [x] Re-point the edition-boundary test (2026-10-04): `_Addon` forbids any dependency on `@amo/azure-auth`, `@amo/azure-arm`, `@amo/azure-execution` or `@azure/*` and checks the interface package has no Azure endpoint or auth import; `_App` has the mirror `appliance-boundary` test.
- [ ] Commit each tree (first commit per repository), add the GitHub remotes, push `_Addon` first, tag `v0.1.0`, then push `_App`. Run gitleaks on each first commit before pushing.
- [ ] Inspect the full candidate Git contents and history for credentials, customer inventories, local output, sensitive configuration, and unrelated files. Most project files were untracked during the initial review; verify the actual staged contents before the first push to either public repository.
- [ ] Confirm the license, ownership metadata, security reporting route, and public project description for each repository. Both are under `saulpatinojr`; transfer to the `HybridCloudWorks` organization is a separate, undecided step.
- [ ] Reconcile README, architecture, edition, deployment, and validation documents with current code and the smaller first-release posture.
- [ ] Remove obsolete account/image references and distinguish local examples, supported deployment profiles, and experimental templates. Done 2026-10-04: `hcw-architect` → `saulpatinojr` in CODEOWNERS, compose, Coder, Terraform defaults and deployment docs; integration guide points at `@hybridcloudworks/migration-ui` / `_Addon`. Open: Terraform and compose image defaults still end in `:latest` (replace with digests at the Phase 2 release); profile labelling not yet done.
- [x] Fix the invalid lab Dockerfile entry in the image-release workflow (2026-10-04). GHCR namespace is `ghcr.io/saulpatinojr/...`, already lowercase; recheck if the owner changes.
- [x] Fix invalid Coder HCL (two single-line blocks used `;`); `terraform fmt -check` and `terraform validate` pass with the coder and docker providers (2026-10-04). Keep Coder integration disabled for the initial deployment; the template is still unvalidated against a live Coder deployment.
- [x] Correct runtime input validation: `applicationGroupTagKey` is no longer rejected by the credential-name filter; `apiKey`/`accountKey`/`accessKey`/`key` still are (tests added, 2026-10-04).
- [ ] Fix approval targeting and execution authorization defects in retained experimental code: use fully scoped collection targets; align UI/API target formats; authenticate mover requests; enforce execution levels in `addResources`; reconcile commit authorization with documentation. Define approval lifetime and reuse explicitly before any future execution release.
- [ ] Correct bundle manifest coverage, real type-check commands, Windows command compatibility, and rule-report path normalization. Done 2026-10-04: `scripts/package-repository.ps1` excluded every file (an exclude-array element was parsed as a bare `$` regex); fixed and verified in both repositories. Open: the rest.
- [ ] Resolve the root esbuild advisory through a reviewed dependency update; do not use a blanket forced audit fix.
- [ ] Review runtime, image, provider, and runner versions against the website's current version-floor policy and supported platform versions. Record explicit exceptions instead of silently copying older pins.
- [ ] Add CODEOWNERS, contribution/security guidance, issue and PR templates, Dependabot, CodeQL, secret scanning, and repository rules.
- [ ] Pin Actions to verified full commit SHAs; use least-privilege job permissions and GitHub-hosted runners.
- [ ] Require current-head checks and the review → fix → current-head verification cycle in `.github/setup/HANDSHAKE.md` before merge.
- [ ] Enable private vulnerability reporting. Fork PR validation must not receive deployment credentials or execute privileged release jobs.

## Phase 2 — Publish independently consumable artifacts

- [ ] Package the shared core as `@hybridcloudworks/migration-core` and one self-contained UI library as `@hybridcloudworks/migration-ui`, both from `_Addon`; confirm ownership and availability of the npm scope/names before publication. `_App` then replaces its interim release-tag dependency with exact versions.
- [ ] Bundle internal workspace implementation and TypeScript declarations. Keep React/React DOM as peer dependencies and only public dependencies in the published manifest. Ensure no private `@amo/*` dependency remains in the installed package.
- [ ] Preserve browser/prerender-safe imports and document required Tailwind source scanning.
- [ ] Test the packed package in a clean consumer project before publication.
- [ ] Configure npm trusted publishing from a protected GitHub Actions workflow with automatic provenance. Complete the registry's initial package/bootstrap setup as required; do not store a long-lived publishing token as the normal release mechanism.
- [ ] Publish separate lab and appliance images to public GHCR, associated with this repository. Use workflow-scoped `GITHUB_TOKEN` for publication and anonymous public image pulls at runtime.
- [ ] Build, test, and scan release images before promoting a release; include SBOMs and provenance and record immutable image digests.
- [ ] Publish versioned CLI release assets with checksums after platform-specific smoke checks.
- [ ] Start at `v0.1.0`; pin the website to an exact UI version and deployments to corresponding immutable image digests. Never deploy `latest` or a moving branch as the artifact contract.

## Phase 3 — Add the explorer to the website and reuse Hostinger

- [ ] Add the introduction, assessment, and explorer routes to the website's actual route and content inventories. Use the proposed `/education/migration-labs` route family after checking for existing collisions and navigation conventions.
- [ ] Lazy-load the React explorer directly in the website. Preserve prerendering and add the public package to Tailwind source scanning; do not frame a second explorer UI.
- [ ] Configure `migration-api.lab.hybridcloudworks.com` using the existing lab wildcard DNS/certificate arrangement. Verify the hostname and VPS capacity before deployment.
- [ ] Add an Ansible-managed lab API container through the website's host configuration. Use a loopback-only published port and a Caddy `/api/*` reverse-proxy route. Preserve existing direct-browsing/panes policies and unrelated services.
- [ ] Keep the container non-root, read-only, capability-restricted, resource-limited, and health-checked with bounded logs. Mount neither the Docker socket nor host credential directories.
- [ ] Require Turnstile for uploads and exact-origin CORS for `https://hybridcloudworks.com` and `https://www.hybridcloudworks.com`.
- [ ] Preserve 5 MB/5,000-row input limits, owner-token isolation, a default 120-minute TTL, bounded memory storage, and explicit deletion.
- [ ] Add bounded assessment concurrency and application-level request limiting so abuse controls do not depend on Cloudflare plan entitlements. Include overload responses and recovery checks in acceptance tests.
- [ ] Keep telemetry and Coder workspace creation off initially. Present upload processing, expiration, and restart-related deletion clearly beside the upload control.
- [ ] Store host runtime secrets through the existing host secret-management process. Keep public API URLs and Turnstile site keys in public configuration; secret values must not enter Vite bundles, Git, Terraform state, or logs.
- [ ] Roll back through the previous pinned UI version and API image digest using reviewed host configuration changes.

## Phase 4 — Deploy a small read-only Azure appliance

- [ ] Add a project profile in `infrastructure/terraform/appliance-project`, separate from the larger experimental appliance template.
- [ ] Build an appliance image serving the compiled UI and API at the same origin. Protect `/api/*` as appropriate, provide static asset/SPA fallback handling, and avoid introducing a cross-origin UI/API split.
- [ ] Use `migrate.hybridcloudworks.com` for the appliance with verified custom-domain HTTPS. DNS records must have one Terraform owner; coordinate any existing shared-zone configuration rather than duplicating it.
- [ ] Start with one Consumption Container App, minimum/maximum one replica, 0.25 vCPU and 0.5 GiB memory. Confirm these limits through realistic inventory tests before deployment.
- [ ] Provide an explicit reviewed idle-mode change to zero minimum replicas. Explain that restart, revision deployment, or idle shutdown discards session-only assessments.
- [ ] Deploy a user-assigned managed identity with Reader only on approved assessment scopes; enforce that allowlist in the API as well as Azure RBAC.
- [ ] Use tenant-only Entra sign-in with assigned users/groups. Supply API and SPA registration identifiers through separately documented bootstrap; do not give the infrastructure deployment identity broad directory-management permissions.
- [ ] Make execution unavailable in the project profile: reject approvals and Resource Mover write routes, cap user authorization at planning, and expose read-only mode in health responses and UI. Default to disabled execution; Reader RBAC alone is not the application-level control.
- [ ] Add an owner-authorized appliance bundle-download endpoint rebuilding the bundle from the stored assessment.
- [ ] Omit PostgreSQL, the polling worker, custom VNet, private endpoints, and Application Insights initially. Use bounded, content-free platform logs and explicitly disclose temporary storage.
- [ ] Run real test-scope sign-in and Resource Graph assessments before describing authenticated discovery as validated. Do not enable migration execution as part of these tests.

## Phase 5 — Terraform and delivery controls

- [ ] Follow the website's IaC standard, tagging contract, naming guidance, required-input inventory, and secrets-placement rules. Preserve existing resource addresses and ownership.
- [ ] Create HCP workspace `hcw-amo-project` in organization `hcw`, under a new `Projects` project. Verify availability before creation. Never point this root at `hcw-azure`, `hcw-lab`, or legacy `HCW` state.
- [ ] Configure HCP dynamic Azure credentials with separate plan/apply permissions and trust scoped to the exact project, workspace, and run phase.
- [ ] Keep automatic apply disabled. Delivery is an explicit protected manual action; review the current plan before approval and reject unexpected destroys/replacements.
- [ ] Pin verified provider versions; commit `.terraform.lock.hcl` for each supported deployable root and relevant platform checksums.
- [ ] Run credential-free Terraform formatting, initialization without a backend, validation, TFLint, policy/security checks, and project-profile tests in PR CI. Run authenticated plans only through the approved HCP workflow.
- [ ] Keep Terraform state, saved plans, real variable files, `.env`, credentials, and customer inventory out of Git and public artifacts. Add missing `*.tfplan` exclusions.
- [ ] Do not generate secret values through Terraform. Provision required secrets out-of-band and record references and consumers, never values.
- [ ] Set a $50 monthly incremental budget target and alerts at 50%, 80%, and 100%; budget alerts are notifications, not a hard spending cap. Check the regional estimate before apply and review actual cost after two weeks.

## Acceptance gates and rollout order

| Gate | Required evidence |
| --- | --- |
| Public source upload | Reviewed candidate Git contents/history; accurate project posture; no secrets or customer data; coherent release workflows |
| Core verification | `npm test`, `npm run rules:validate`, golden comparison, real frontend type checks and builds |
| Artifact release | Clean packed-package installation; both Docker images build and pass smoke/security checks; documented version, digest, SBOM, provenance |
| Infrastructure | Supported Terraform roots initialize/validate; reviewed HCP plan; no unexpected destruction or duplicated ownership |
| Website | Prerender and route checks; browser upload, Turnstile, CORS, assessment, file/ZIP download, isolation, deletion and TTL tests |
| Hostinger | Additive Ansible change; loopback API binding; healthy Caddy routing; unrelated host services unaffected; digest rollback verified |
| Appliance | Assigned-user sign-in; allowed-scope discovery; denied unapproved scopes; owner-only bundles; execution refused; documented session loss after restart |
| Public uploads | Migration-rule sources independently verified; deployed browser checks green; limits and privacy disclosures present |
| Operating budget | Regional estimate fits the agreed target; alert delivery configured; actual cost reviewed after two weeks |

Rollout sequence:

1. Prepare and publish reviewed public source without automatically deploying it.
2. Publish verified UI, container, and CLI release artifacts.
3. Integrate the exact UI release into the website and deploy the lab API through existing host management.
4. Enable public uploads only after deployed validation passes.
5. Deploy and validate the read-only Azure appliance independently.

A code publication is not a deployment approval. Keep external publishing, infrastructure application, and website delivery explicit and reviewable.

## Initial review baseline and limitations

The review executed on 2026-10-03 reported:

- 92 passing tests and a passing core TypeScript build.
- 35 rules, snapshot `1.0.35`, with matching corpus checksum.
- A 29-resource sample assessment producing 51 files and no safety findings.
- Passing appliance-web type check and appliance-web/UI-harness builds.
- Passing formatting checks for the Azure, Cloudflare, and Hostinger Terraform directories, but a Coder template parse failure.
- One moderate root esbuild advisory.

These are historical review observations, not evidence for a future release head. Checks used Node 26.7 while existing CI targeted Node 22. Live Azure, PostgreSQL, Coder, Docker deployment, provider initialization/validation, and browser E2E were not established by that review. Structural rule validation does not establish correctness of Azure support statements.

## Assumptions and deferred work

- The existing VPS has capacity; measure it before adding the service.
- The proposed repository/package/domain/workspace names need ownership and collision verification, not automatic substitution with unrelated names.
- The $25–$75 range is an incremental budget target, not a provider quote or guarantee. Logging, compute, HCP entitlements, and provider plans must be checked before deployment.
- No new Hostinger purchase, Cloudflare Tunnel, PostgreSQL, polling worker, Coder infrastructure, live migration execution, Marketplace listing, or production-readiness claim is included in the initial release.
- Durable storage, additional replicas, execution, and customer-facing enterprise operation require separate design decisions, security review, and live validation.

## Reference sources

- Website: https://github.com/HybridCloudWorks/HCW-HybridCloudWorks
- Existing host management: https://github.com/HybridCloudWorks/HCW-HybridCloudWorks/blob/main/lab-host/README.md
- Existing VPS ownership: https://github.com/HybridCloudWorks/HCW-HybridCloudWorks/blob/main/infra-lab/README.md
- HCW IaC standard: https://github.com/HybridCloudWorks/HCW-HybridCloudWorks/blob/main/docs/standards/iac-repository-standard.md
- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/
- Public npm packages: https://docs.npmjs.com/about-public-packages/
- GHCR: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Actions security: https://docs.github.com/en/actions/reference/security/secure-use
- HCP dynamic credentials: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials
- Terraform lock files: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Container Apps plans: https://learn.microsoft.com/en-us/azure/container-apps/plans
- Container Apps billing: https://learn.microsoft.com/en-us/azure/container-apps/billing

Sources and website configuration were inspected on 2026-10-03. Recheck provider contracts and runtime versions when implementing.
