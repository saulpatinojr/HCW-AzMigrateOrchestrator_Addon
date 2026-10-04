# Hostinger

**What it does here.** Hosts the Hybrid Cloud Works Migration Explorer lab API on a KVM VPS.

**Where.** `infrastructure/terraform/lab-hostinger/` provisions the VPS, SSH key and firewall with the Hostinger Terraform
provider from the Hostinger API; `cloud-init.yaml.tftpl` hardens the host and stages `docker-compose.lab.yml`. The VPS opens
**no inbound ports** except operator SSH; traffic arrives through a Cloudflare Tunnel.

**Why Hostinger for this.** Predictable monthly cost for an always-on educational lab, Docker-ready OS templates, and an
API + Terraform provider that make the entire lab reproducible from this repository — the same infrastructure-as-code story
the lab teaches.

**What the lab can publish.** Availability from the site's probe Worker, assessments per week (counts only, no customer
data), image size and cold-start time of the lab container, monthly cost. **No inventory data ever leaves memory.**

**Sizing.** KVM 4 by default so the Coder lab can share the host; KVM 2 is enough for the API alone.
