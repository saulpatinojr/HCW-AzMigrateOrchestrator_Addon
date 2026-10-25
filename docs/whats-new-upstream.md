# What's new upstream

The upstream product is [`HCW-MigrateOrchestrator_App`](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App). This
edition adopts its release tarballs (`@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui`) and nothing else.

## How to use this file

Read it before you change behaviour, bump the upstream pin or review a `core-update` pull request: it says what changed
upstream, whether it reaches this edition, and what to run. Add an entry when a change lands upstream that reaches this
edition (the upstream `CLAUDE.md` asks for the same), newest first, and keep the table below true.

## Current upstream state (checked 2026-10-24)

| Question | Answer |
|---|---|
| Upstream `main` | `2c54b46` (merge of upstream pull request #68, the rename). Pull requests #62 and #68 are both merged |
| Latest upstream release | `v0.3.1`, published 2026-10-11, tag commit `b7db4c8` (annotated tag) |
| What this edition pins | `v0.3.1`: `migration-core` and `migration-ui` as release tarballs, by URL in `package.json` and by integrity hash in `package-lock.json` |
| Drift between pin and latest release | None |
| Do the pinned hashes match the published assets? | Yes. The two `v0.3.1` tarballs were downloaded on 2026-10-24 and their SHA-512 values equal the `integrity` entries in `package-lock.json` (`sha512-94xboh+o…` for core, `sha512-DaD5DRD1…` for ui) |
| Unreleased upstream changes that touch the tarballs | One: `migration-ui`'s `package.json` has newer dependency ranges (see the 2026-10-18 and 2026-10-19 entry), and the next release is compiled with TypeScript 7 (2026-10-11 entry). Nothing under `packages/*/src` and nothing in the shipped rule corpus has changed since `v0.3.1` |
| Tags | Upstream now has a ruleset that stops `v*` tags being deleted or moved. Before 2026-10-24 the `v0.3.1` tag had been moved once; the final assets match the pin, but a moved tag is exactly how a pinned URL could change underneath this edition |

How "nothing changed" was checked: `git diff v0.3.1 origin/main -- packages rules scripts/assemble-packages.mjs` upstream lists
only `packages/ui/package.json` and the rule-diff report files under `rules/reports/`. The core tarball ships only
`rules/azure`, `rules/organization`, `rules/schemas` and `rules/snapshots` (`scripts/assemble-packages.mjs`), and none of those changed.
The upstream suite also passes: 110 tests, 35 rules, snapshot 1.0.35.

## Entries (newest first)

### 2026-10-24: the upstream repository was renamed (now `HCW-MigrateOrchestrator_App`)

- The upstream product `saulpatinojr/HCW-AzMigrateOrchestrator_App` is now `saulpatinojr/HCW-MigrateOrchestrator_App`
  (upstream pull request [68](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/68) updates its own references).
  GitHub redirects the old address, including release downloads, so nothing broke at the moment of the rename.
- **Reaches this edition? Yes, and it is a change here.** `package.json` and `package-lock.json` now name the new address in the two
  `v0.3.1` tarball URLs. The release tag is the same and the `integrity` hashes were not touched, because the files are the
  same files; only the address in front of them changed. `core-update.yml` now looks for releases at the new name
  (`UPSTREAM`); the way it reads the pinned tag and rewrites it does not depend on the repository name. The rest are links
  and descriptions in the documents.
- This edition was renamed on 2026-10-24 from `HCW-AzMigrateOrchestrator_Addon` to `HCW-MigrateOrchestrator_AddOn`, to match the upstream App and the other add-ons. GitHub redirects the old address.
- Left as written on purpose: the older changelog entry that records what happened at the time, and the ADR copies, which say
  where they were copied from.
- Next upstream release: its `package.json` files will name the new repository address (the upstream assembly script was updated).
  That is metadata only. Nothing to run beyond the usual `core-update` check.
- The old address keeps redirecting only while nobody creates a repository with the old name. Do not reuse it.

### 2026-10-24: documentation, repository protection and CI upstream

| Upstream change | Reaches this edition? | Action here |
|---|---|---|
| [#62](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/62): README, plan, validation record and manifest label brought up to date; adds the rule that asks for entries in this file | No code. Docs only | None. This file exists because of it |
| [#61](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/61): `appliance-image` is a required check on upstream `main` | No. It guards the appliance image, which this edition does not build or ship | None |
| [#60](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/60): the appliance's Terraform `image_ref` has no `:latest` default and must be an exact `@sha256:` digest | **No.** The Terraform root `infrastructure/terraform/appliance-azure` is upstream-only. This edition deploys its own image, `docker.io/hybridcloudworks/hcw-addon-migration`, by digest through the website's `addons` Ansible role (`docs/deployment/lab-host.md`), and that path is unchanged | None |
| [#59](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/59): pull requests upstream now build, lint (hadolint), scan (Trivy) and start the appliance image | No. Same reason as #61 | None |
| [#58](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/58): documentation drift after the repository split fixed upstream; the ledger and matrix now mark `apps/lab-api`, `apps/lab-web`, `apps/ui-harness`, `docs/demo/*` and `infrastructure/coder` as owned by this edition | Docs only; confirms what this edition owns | None |
| [#57](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/57): a manual administration workflow applies upstream rulesets for `main` and for `v*` tags | **Yes, in effect.** Release tags upstream can no longer be deleted or moved, so the release URLs and integrity hashes pinned here stay valid | Keep pinning by exact tag. Never point the pin at `main` or at a tag that is not a published release |
| [#41](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/41) and [#56](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/56): plain-language rules for talking to the owner in upstream `CLAUDE.md` | No | None |

Published but not changed: the appliance image upstream was **not** published for `v0.3.0` or `v0.3.1` (the `publish-images`
job is skipped while `DOCKERHUB_ENABLED` is not set; upstream ticket [#42](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/42)).
That affects only the enterprise appliance. This edition's own image publishes from this repository.

### 2026-10-18 and 2026-10-19: dependency updates upstream (merged Dependabot pull requests)

| Upstream change | Reaches this edition? | Action here |
|---|---|---|
| [#29](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/29) and [#38](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/38) `@radix-ui/react-dialog` to 1.3.1, [#33](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/33) `@radix-ui/react-tabs` to ^1.2.1, [#37](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/37) `react-dom` to 19.3.1 | **Yes, at the next upstream release.** `packages/ui/package.json` now declares `@radix-ui/react-dialog` ^1.3.1, `@radix-ui/react-tabs` ^1.2.1 and a `react-dom` peer of ^19.3.1 (they were ^1.1.6, ^1.1.3 and ^19.0.0 in `v0.3.1`). This edition's lock holds dialog 1.1.23 and tabs 1.1.21, so the `core-update` re-lock will move both. Its `react-dom` is already 19.3.1, which satisfies the new peer | When the `core-update` pull request arrives: run `npm ci`, `npm test` and `npm run e2e`; look at the two places the explorer uses them, the decision-detail dialog (`DecisionDetail`) and the generated-files tabs (`GeneratedFiles`), in the e2e report |
| [#36](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/36) `@azure/msal-browser`, [#35](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/35) dev group, GitHub Actions updates ([#26](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/26), [#27](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/27), [#28](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/28), [#31](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/31), [#40](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/40)) | No. Appliance web app, upstream dev tooling and upstream workflows only | None |
| [#34](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/34): a refreshed Microsoft Learn move-support diff report | No. It is a report under `rules/reports/`, outside the shipped rule corpus; the rules and snapshot (35 rules, 1.0.35) are unchanged | None |

### 2026-10-11: build tooling upstream

| Upstream change | Reaches this edition? | Action here |
|---|---|---|
| [#23](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/23): upstream builds with TypeScript 7, Vite 8 and `@vitejs/plugin-react` 6 | **Yes, at the next upstream release.** The published `dist/` and type declarations are compiled by the release workflow, so the next tarballs are built with TypeScript 7 instead of 5.6. `v0.3.1` was built before this change | Same checks as above; also run `npm run typecheck` here, since this edition's code consumes the published `.d.ts` files |
| [#24](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/24) and [#25](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/pull/25): upstream workflow credentials and README | No | None |

### 2026-10-11: the last release this edition adopted

`v0.3.1`: the questionnaire keeps focus, destination region is a select, and portal exports without a RESOURCE ID column derive ids from RESOURCE LINK
(upstream `CHANGELOG.md`, section 0.3.1). This edition adopted it (`package.json` pin, `package-lock.json` integrity, hashes verified above).

## Open upstream decisions that affect this edition

None of these blocks this edition today. Each is the owner's call upstream.

| Upstream ticket | What it decides | Why it matters here |
|---|---|---|
| [#42](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/42) | Whether and when the enterprise appliance image is published to Docker Hub | None for the pane. Until it is set, `v0.3.x` has no appliance image |
| [#52](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/52) | Release hygiene: per-job permissions, one job creating the release, an SBOM, a post-release check of the tarballs | The tag half is done (see #57 above). The SBOM would add a file next to the tarballs; the URLs this edition pins would not change |
| [#44](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/44) | Whether the appliance API gets an origin allow-list or is documented as same-origin only | None. This edition has its own exact-origin CORS and must not copy any wildcard |
| [#46](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/46) | Role model for the appliance's Entra sign-in | None. This edition has no sign-in by design |
| [#53](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App/issues/53) | Appliance Terraform hardening (subnet firewalls, backup, private endpoint) | None. Upstream infrastructure only |

## Known documentation errors outside this repository

- The GitHub Release notes for this edition's `v0.3.1` say it adopts "`@amo/migration-core` and `@amo/report-templates`". The
  packages are `@hybridcloudworks/migration-core` and `@hybridcloudworks/migration-ui`. Release notes are published text, so this
  was not edited; an owner can correct it on the [release page](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_AddOn/releases/tag/v0.3.1).
