# Infrastructure

| Path | What | Status |
|---|---|---|
| `docker/Dockerfile.lab` | AddOn image on `node:26-bookworm-slim` (pinned by digest), built from the parent directory holding both checkouts: upstream packages packed into `node_modules`, the API (`tsc`) and the pane (`vite`) built before devDependencies are pruned, Debian security upgrades, npm removed, non-root, health check, OCI labels. Published to `docker.io/hybridcloudworks/hcw-addon-migration` by `publish-images.yml` after a Trivy scan, with provenance and SBOM, through the Docker OIDC connection | Supported build; the website pins the digest |
| `coder/template/` · `coder/image/` | Coder guided-lab workspace template and tooling image (no credentials, no cloud access) | Validates in CI (`iac-validate`); Coder integration is disabled for the initial deployment; image published manually (`publish-workspace-image.yml`) |
| `terraform/lab-hostinger/` · `terraform/lab-cloudflare/` · `reverse-proxy/README.md` | Standalone VPS + Cloudflare Tunnel edge for a *new* host (ADR-0019) | **Retired 2026-10-10**, marked at the top of each file; no longer validated; deleted in a follow-up pull request. Never apply them to the existing host |
| `monitoring/README.md` | Logging, health and alerting notes | Notes only |

The deployment is the website repository's: its `lab-host/ansible/roles/addons` role runs this image as the container
`hcw-addon-migration` on `127.0.0.1:18081` behind the host's Caddy at `migration.lab.hybridcloudworks.com`, with the
environment and hardening in `docs/deployment/lab-host.md`. This repository ships the image and the env contract only.
