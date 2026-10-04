# Changelog

The engine, rules, CLI and UI components are versioned and released upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App`
(see its `CHANGELOG.md`, which also carries the history of the pre-split monorepo). This file tracks the web-front edition only.

## Unreleased — 2026-10-04 (ADR-0028 flip)

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
- Tags `v0.1.0`–`v0.1.3` of this repository predate the flip (they released the former core from here) and are historical.
