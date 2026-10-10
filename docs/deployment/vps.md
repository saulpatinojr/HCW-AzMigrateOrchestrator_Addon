# Retired: the standalone VPS deployment

Retired 2026-10-10. The AddOn is hosted by the website repository's `addons` Ansible role on the existing lab host; see
[`lab-host.md`](lab-host.md). The Compose-with-tunnel file (`docker-compose.lab.yml`), the Cloudflare Tunnel edge (ADR-0019)
and the standalone Terraform (`infrastructure/terraform/lab-*`, marked retired, deleted in a follow-up pull request) are no
longer a supported path. This page is kept only so older links resolve.
