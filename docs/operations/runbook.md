# Operations runbook (lab host)

The AddOn runs as the container `hcw-addon-migration` on the hybridcloudworks.com lab host, created by the website
repository's `addons` Ansible role (`docs/deployment/lab-host.md`). There is no Compose on the host. Commands are PowerShell
from a workstation with the `hcw-lab` SSH alias the website runbook defines; each works unchanged in bash.

- **Health (loopback, what the role waits for):** `ssh hcw-lab "curl -s http://127.0.0.1:18081/api/health"` → a JSON line
  starting `{"ok":true,"id":"migration","version":"0.3.0"`. Public: `curl.exe -s https://migration.lab.hybridcloudworks.com/api/health`.
- **Logs:** `ssh hcw-lab "sudo docker logs --tail 100 hcw-addon-migration"` (JSON lines, redacted, no inventory content;
  a startup line names the version; a warning names any missing verification configuration).
- **Container state:** `ssh hcw-lab "sudo docker inspect --format '{{.State.Health.Status}} {{.Config.Image}}' hcw-addon-migration"` → `healthy` and the pinned `image@sha256:…`.
- **Restart:** `ssh hcw-lab "sudo docker restart hcw-addon-migration"`. Restarting drops every in-memory assessment by design.
- **Upgrade / rollback:** change the digest in the website's `group_vars/all.yml` and run `ssh hcw-lab "sudo /opt/hcw-src/lab-host/bootstrap.sh"`; rollback is the previous digest the same way (`docs/deployment/lab-host.md`).
- **Kill switches:** `enabled: false` on the website's `addons[]` row removes the container; unsetting `ADDON_MIGRATION_URL` on the site's Function App closes the pane while the container keeps running.
- **Rule update:** rules ship inside `@hybridcloudworks/migration-core`; adopt the upstream release through `core-update.yml`, tag, publish, pin the new digest.
- **Abuse:** the API rate-limits uploads per client (`429` with `Retry-After`) and caps concurrent assessments (`503 overloaded`); the host's Caddy rate limit sits in front. Tighten with `AMO_RATE_LIMIT_POSTS`, `AMO_RATE_LIMIT_WINDOW_MINUTES`, `AMO_MAX_CONCURRENT` in the row's `env`.
- **Verification outage:** `siteverify-unreachable` in a 403's `details.codes` means the container cannot reach the verification endpoint (the only egress it needs). Uploads fail closed until it returns.
- **Data requests:** nothing is persisted; an assessment is gone at TTL (120 min) or on delete; a container restart purges everything.
