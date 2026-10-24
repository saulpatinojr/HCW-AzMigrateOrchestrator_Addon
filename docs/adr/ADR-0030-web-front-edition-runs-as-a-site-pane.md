# ADR-0030: The web-front edition runs as a site pane

**Status:** Accepted · **Date:** 2026-10-10 · **Supersedes the "website installs the UI package from npm" consequence of ADR-0028 and the WORKING-PLAN Phase 3 line "do not frame a second explorer UI"**

## Context

ADR-0028 made this repository the upstream product and left the website's integration path as an npm island: the site
would install `@hybridcloudworks/migration-ui` at an exact version once the packages were published. That path has not
opened. npm publication is paused by the owner (`docs/release/npm-publishing.md`), and the website's own rules would
refuse the island even when it resumes: its content security policy closes `connect-src` to its own origin, so an
embedded explorer could not reach a lab API on another host; its public-copy rule forbids vendor names on public pages,
which the explorer's partner panel carries; and an island ties the site's deploy to this repository's release cadence.

The website already runs independently deployed tools as sandboxed panes (its Coder labs): a catalogue row, a
`frame-src` entry, a server-side status proxy and a lab host behind Caddy. On 2026-10-09 the owner generalised that
model for every HCW AddOn (website ADR 0035 and the HCW AddOn Integration Standard) and rejected the npm island. The
downstream edition `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` therefore needs a pane app of its own that mounts
`MigrationExplorer`, and the explorer must be mountable inside a frame: same-origin API by default, no partner copy,
stage events for the pane protocol, and host-mediated navigation, because the site's `frame-ancestors 'none'` blocks
in-frame links back to the site.

## Decision

1. The web-front edition is a separately deployed web application at `https://migration.lab.hybridcloudworks.com`,
   framed by the site at `/tools/migration`. The downstream repository owns the pane app (`apps/lab-web`), the pane
   protocol implementation, the lab API's framing headers, rate limiting and concurrency, the container image
   (`docker.io/hybridcloudworks/hcw-addon-migration`, pinned by digest on the website's lab host) and the
   website-integration docs. The website owns the catalogue row, the page, the CSP entry, the status proxy and the
   Ansible `addons` role.
2. This repository makes `MigrationExplorer` pane-ready with optional, additive props: `apiBaseUrl` (default `""`),
   `partners`, `cta`, `onStageChange`, `onNavigate`, `contactPath`; it exports `Stage` and `EnterpriseCta`. Engine,
   rules, limits, the confidence cap and the edition boundary do not change.
3. The contract shared by the AddOn and the website's status proxy lives in `packages/contracts`: `AddOnHealth` (flat
   envelope `ok, id, version, edition, capabilities, asOf, siteOrigins, turnstile`), `ADDON_HEALTH_FIELDS`,
   `isAddOnHealth`, `ADDON_PANE_STATES`, `AddOnPaneState`, `AddOnPaneMessage`. The AddOn serves it; this repository
   defines it; the website reads only its six-field projection.
4. The partner panel (`PoweredBy`) stays in the package for the appliance web and the default explorer and is never
   rendered in the site pane (`partners={false}`).
5. npm publication of the two packages becomes optional for the website path. It remains the intended distribution
   for third-party consumers and the long-term replacement of the `file:` link (ADR-0028, item 4), but nothing on
   hybridcloudworks.com waits on it.

## Consequences

- The site's deploy and this repository's release cadence are decoupled: a new explorer reaches visitors when the AddOn
  adopts the release through `core-update`, tags, and the website moves one image digest.
- `MigrationExplorer` renders with no props; every existing caller (`apps/appliance-web`, the downstream harness)
  keeps working unchanged.
- The pane protocol and the health envelope are versioned by the website's standard; a breaking change to either is a
  new revision there and a major version here.
- WORKING-PLAN Phase 3 is rewritten: route `/tools/migration`, hostname `migration.lab.hybridcloudworks.com`, hosting
  by the website's `addons` role, rate limiting and concurrency delivered downstream, npm publication optional.
- `edition` stays `demo` in the lab API's health; the site's proxy treats the string as opaque.
- Amended 2026-10-11: the artifact the downstream edition consumes is the pair of package tarballs attached to this
  repository's GitHub Release of each `v*` tag (`release-cli.yml`, job `packages`), pinned there by URL and integrity
  hash; the ADR-0028 interim contract (a sibling checkout built at `APP_REF`) is retired. This is the same method the
  Cloud Assessor and NetworkEyes pairs use (a release wheel pinned by URL and sha256), so all three pairs adopt
  releases the same way, with no registry on the path.
- Next ADR number: 0031.
