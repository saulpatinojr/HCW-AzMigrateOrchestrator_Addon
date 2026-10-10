# Deployment: the lab host

This repository ships an **image and an environment contract**; it does not deploy anything. The AddOn runs on the
hybridcloudworks.com lab host as one hardened container created by the website repository's Ansible role
`lab-host/ansible/roles/addons` (`HCW-HybridCloudWorks`), behind that host's Caddy, from the `addons[]` entry in
`lab-host/ansible/group_vars/all.yml`:

| Field | Value |
|---|---|
| `id` | `migration` |
| `image` / `image_tag` / `image_digest` | `docker.io/hybridcloudworks/hcw-addon-migration` / `0.3.0` / the digest `publish-images.yml` printed |
| `port` | `18081` (published as `127.0.0.1:18081:8080`, loopback only) |
| `memory` / `pids` | `512m` / `256` |
| hardening (the role applies it) | read-only root, `tmpfs /tmp`, `cap_drop ALL`, `no-new-privileges`, one CPU, `restart unless-stopped`, the image's `HEALTHCHECK`, no volumes, no socket, default bridge |
| `env` | the table below |
| `secret_env` | `TURNSTILE_SECRET` from `vault_addon_migration_turnstile_secret` |

## Environment

| Variable | Value on the host | Notes |
|---|---|---|
| `AMO_FRAME_ANCESTORS` | `'self' https://hybridcloudworks.com https://www.hybridcloudworks.com` | Equals `caddy_frame_ancestors`, so CSP and Caddy agree |
| `AMO_SITE_ORIGINS` | `https://hybridcloudworks.com https://www.hybridcloudworks.com` | Pane message targets |
| `AMO_TRUST_PROXY` | `1` | Caddy sets `X-Forwarded-For`; nothing else reaches the loopback port |
| `AMO_TURNSTILE_SITE_KEY` | the widget's site key | Public; published by `/api/health`. Required with the secret: without it the container refuses to start |
| `AMO_RATE_LIMIT_POSTS` / `AMO_RATE_LIMIT_WINDOW_MINUTES` / `AMO_MAX_CONCURRENT` | `10` / `10` / `2` | Defaults; override per host |
| `AMO_ASSESSMENT_TTL_MINUTES` | `120` | |
| `AMO_PUBLIC_BASE_URL` | `https://migration.lab.hybridcloudworks.com` | |
| `TURNSTILE_SECRET` | vault | Never in `group_vars`, Git or the image |
| `AMO_ALLOW_NO_TURNSTILE` | unset | Setting it on a host would accept unverified uploads |

`.env.example` lists every variable with a comment; `docs/website-integration/integration-guide.md` section 6 explains each.

## Owner steps (once)

**1. Create the human-verification widget** at https://dash.cloudflare.com/?to=/:account/turnstile → **Add widget**:

| Field | Value |
|---|---|
| Widget name | `hcw-addon-migration` |
| Hostname management | `migration.lab.hybridcloudworks.com` |
| Widget mode | Managed |
| Pre-clearance | No |

Copy the **Site Key** into the website repository's `group_vars/all.yml` (`addons[].env.AMO_TURNSTILE_SITE_KEY` for id
`migration`) in the website pull request; it is public. Then copy the **Secret Key** and, with it on the clipboard, set the
vault key (PowerShell, from the workstation that has the `hcw-lab` SSH alias the website runbook defines):

```powershell
(Get-Clipboard -Raw) | ssh hcw-lab "sudo -n /usr/local/sbin/hcw-vault-set vault_addon_migration_turnstile_secret"
```

The same line in bash (Git Bash on Windows, where the clipboard is `/dev/clipboard`):

```bash
cat /dev/clipboard | ssh hcw-lab "sudo -n /usr/local/sbin/hcw-vault-set vault_addon_migration_turnstile_secret"
```

Success looks like: the command prints nothing and exits 0. The value never appears on a command line or in output.

**2. Allow this repository to publish to Docker Hub.** In Docker Home create an OIDC connection for this repository trusting
`repo:saulpatinojr@34853639/HCW-AzMigrateOrchestrator_Addon@1403980201:ref:refs/tags/*` (the repository id, read with
`gh api repos/saulpatinojr/HCW-AzMigrateOrchestrator_Addon --jq .id` on 2026-10-10) with read and write on `hybridcloudworks/hcw-addon-migration`, then set the two repository variables
(PowerShell; `gh` must be signed in):

```powershell
gh variable set DOCKERHUB_CONNECTION --repo saulpatinojr/HCW-AzMigrateOrchestrator_Addon --body (Get-Clipboard)
gh variable set DOCKERHUB_ENABLED --repo saulpatinojr/HCW-AzMigrateOrchestrator_Addon --body true
```

The first line reads the connection's UUID from the clipboard. Until both are set, `publish-images.yml` skips and the
website catalogue row stays `coming`.

**3. Release.** Tag `v0.3.0` here; the run summary of `publish-images` prints
`docker.io/hybridcloudworks/hcw-addon-migration@sha256:…`. Put that digest and the tag in the website's `group_vars/all.yml`
and apply the host from the website repository as its README describes (PowerShell):

```powershell
ssh hcw-lab "sudo /opt/hcw-src/lab-host/bootstrap.sh"
```

## Health, logs, rollback

Health over SSH (PowerShell or bash; success is a JSON line starting `{"ok":true,"id":"migration"`):

```powershell
ssh hcw-lab "curl -s http://127.0.0.1:18081/api/health"
```

Logs (JSON lines, redacted, no inventory content):

```powershell
ssh hcw-lab "sudo docker logs --tail 100 hcw-addon-migration"
```

From the public side, headers (success: `x-addon-id: migration`, a `content-security-policy` whose `frame-ancestors` names the
site, and no `x-frame-options`):

```powershell
curl.exe -sI https://migration.lab.hybridcloudworks.com/ | findstr /i "x-addon content-security-policy x-frame-options"
```

**Rollback** is the previous digest: change `addons[].image_digest` (and `image_tag`) back in the website's
`group_vars/all.yml`, merge, and run the same `bootstrap.sh` line. Restarting or replacing the container drops every
in-memory assessment by design. Setting the row's `enabled: false` removes the container; unsetting `ADDON_MIGRATION_URL`
on the site's Function App closes the pane without touching the host.

## Development and e2e are not deployments

`docker-compose.yml` runs the image locally with `AMO_ALLOW_NO_TURNSTILE=1` and `AMO_FRAME_ANCESTORS='self'`.
`playwright.config.ts` runs the API with the public always-passes test site key `1x00000000000000000000AA`, a siteverify mock
and a host page that frames the pane. Neither is a host configuration.
