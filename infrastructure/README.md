# Infrastructure

| Path | What | Status |
|---|---|---|
| `docker/Dockerfile.lab` | Lab API image on `node:26-bookworm-slim`, built from the parent directory holding both checkouts (upstream packages are packed into `node_modules`; nothing from the upstream tree is needed at runtime). Debian security upgrades, npm removed, non-root, health check. Published by `publish-images.yml` after a Trivy scan, with provenance and SBOM | Supported build; deploy by digest |
| `terraform/lab-hostinger/` · `terraform/lab-cloudflare/` | Standalone VPS + Cloudflare Tunnel edge for a *new* host (ADR-0019) | **Experimental templates.** The agreed deployment reuses the existing hybridcloudworks.com Hostinger VPS through *that* repository's Ansible/Caddy host configuration (`WORKING-PLAN.md` Phase 3). Do not apply these to the existing host |
| `coder/template/` · `coder/image/` | Coder guided-lab workspace template and tooling image (no credentials, no cloud access) | Validates in CI; Coder integration is disabled for the initial deployment; image published manually (`publish-workspace-image.yml`) |
| `monitoring/README.md` · `reverse-proxy/README.md` | Logging, health and alerting notes; edge notes for the standalone template | Notes only |

Supported deployment path for the lab API: the website repository's host configuration runs the lab image behind the
host's Caddy on a loopback-only port, with exact-origin CORS and Turnstile; see `docs/deployment/vps.md` and the upstream
working plan.
