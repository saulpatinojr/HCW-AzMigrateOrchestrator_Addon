# Coder browser lab

- Deploy Coder on the demo VPS (or a sibling) behind the same Caddy: `coder.<domain>` with wildcard for workspace apps.
- Sign-in: GitHub OAuth; group-limit workspaces to 1 per user; TTL ≤ 4 h; idle shutdown 30 min; CPU 0.5 / RAM 2 GB.
- Template: `infrastructure/coder/template` (`amo-guided-lab`). Uses the digest-pinned `docker.io/hybridcloudworks/hcw-lab` image under the ADR-0032 / LAB-5 boundary (`tcp://coder-docker-proxy:2375`, `user = "65534:65534"`, `HOME = "/tmp/home"`, `module "code-server"` with `subdomain = true`, per-workspace bridge network `coder-ws-<id>`, all capabilities dropped, `no-new-privileges:true`, **no credentials, no Docker socket, no privileged mode, no host path, no enterprise network**).
- Wiring: set `CODER_URL`, `CODER_SESSION_TOKEN` (a least-privilege template-user token, stored in the host's secret store,
  never in the repo) and `CODER_TEMPLATE_ID` (`amo-guided-lab`) on the demo API. The "Open in Coder" action then issues a one-time bundle token.
- Handoff (ADR-0023): the lab UI calls `POST /api/assessments/{id}/workspace`; the API issues a one-time bundle token and creates
  the workspace with `assessment_id`, `bundle_token`, `api_base_url` parameters; the startup script dispatches to `/usr/local/libexec/hcw-boot/hcw-boot migration-assessment` (with `python3 -m zipfile -e` fallback) to download and unpack the bundle once into `/tmp/home/assessment`.
- Template push: `/usr/local/sbin/hcw-coder-template-push amo-guided-lab` on the lab host, or `coder-template.yml` on changes under `infrastructure/coder/template` (secrets `CODER_URL`, `CODER_SESSION_TOKEN` in the `lab` environment).
