# Hostinger

**What it does here.** Hosts the Hybrid Cloud Works Migration Explorer AddOn on the website's KVM VPS, the existing lab host.

**Where.** The website repository's `lab-host/ansible/roles/addons` role runs this AddOn's image as a hardened container on
`127.0.0.1:18081` behind the host's Caddy (`docs/deployment/lab-host.md`). This repository ships the image and the env
contract only; the standalone VPS Terraform (`infrastructure/terraform/lab-hostinger`) was retired and deleted on 2026-10-10.

**Why Hostinger for this.** Predictable monthly cost for an always-on educational lab, Docker-ready OS templates, and an
API + Terraform provider that make the entire lab reproducible from this repository — the same infrastructure-as-code story
the lab teaches.

**What the lab can publish.** Availability from the site's probe Worker, assessments per week (counts only, no customer
data), image size and cold-start time of the lab container, monthly cost. **No inventory data ever leaves memory.**

**Sizing.** KVM 4 by default so the Coder lab can share the host; KVM 2 is enough for the API alone.
