# Site routes and names for the migration AddOn

| Route or name | Value | Notes |
|---|---|---|
| Site route | `/tools/migration` | Rendered by `frontend/src/pages/tools/AddOnPanePage.jsx` with `addonId="migration"`; in the Tools menu as `Migration Hub` |
| AddOn origin | `https://migration.lab.hybridcloudworks.com` | `'https://' + id + '.lab.hybridcloudworks.com'`; already covered by the `*.lab` DNS record and wildcard certificate |
| Pane URL | `https://migration.lab.hybridcloudworks.com/` | What the frame loads (`panePath: '/'`) |
| Health URL | `https://migration.lab.hybridcloudworks.com/api/health` | What the status proxy reads |
| Status route (site) | `GET /api/public/addons/migration/status` | Anonymous; projection `{ configured, reachable, version, edition, capabilities, asOf }` |
| App setting (site Function App) | `ADDON_MIGRATION_URL` | Plain setting (public value); unsetting it closes the pane |
| Container on the lab host | `hcw-addon-migration` on `127.0.0.1:18081` | Website `addons` role, `group_vars/all.yml` `addons[]` |
| Vault key (lab host) | `vault_addon_migration_turnstile_secret` | Set with `hcw-vault-set`; the role refuses to start the container without it |

Retired (never shipped): the `/education/migration-labs/*` routes, the `migrate-demo` and `labs-api` hostnames, the Cloudflare
Tunnel edge, and the plan to install `@hybridcloudworks/migration-ui` into the site as an npm island. npm publication of the
UI package remains optional upstream and is no longer on the site's path.
