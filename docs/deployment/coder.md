# Coder browser lab

- Deploy Coder on the demo VPS (or a sibling) behind the same Caddy: `coder.<domain>` with wildcard for workspace apps.
- Sign-in: GitHub OAuth; group-limit workspaces to 1 per user; TTL ≤ 4 h; idle shutdown 30 min; CPU 0.5 / RAM 2 GB.
- Template: `infrastructure/coder/template` (variable `demo_api_base_url`). Workspace image `amo-lab-workspace`: code-server,
  terraform, PowerShell, Azure CLI — **no credentials, no Docker socket, no privileged mode, no enterprise network.**
- Wiring: set `CODER_URL`, `CODER_SESSION_TOKEN` (a least-privilege template-user token, stored in the host's secret store,
  never in the repo) and `CODER_TEMPLATE_ID` on the demo API. The "Open in Coder" action then issues a one-time bundle token.
- Handoff (ADR-0023): the lab UI calls `POST /api/assessments/{id}/workspace`; the API issues a one-time bundle token and creates
  the workspace with `assessment_id`, `bundle_token`, `api_base_url` parameters; the startup script downloads the bundle once.
- Image: `infrastructure/coder/image/Dockerfile` → `ghcr.io/…/azure-migration-orchestrator-lab-workspace` (published by `publish-images.yml`).
- Template push: `coder-template.yml` on changes under `infrastructure/coder/template` (secrets `CODER_URL`, `CODER_SESSION_TOKEN` in the `lab` environment).
- Not validated against a live deployment in this build.
