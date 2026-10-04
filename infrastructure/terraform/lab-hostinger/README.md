# Lab VPS — Hostinger

Provisions one KVM VPS from Hostinger's Docker OS template, an SSH key, and a firewall that admits **only SSH from your
CIDR**. HTTP/HTTPS never open: `cloudflared` in `docker-compose.lab.yml` dials out to Cloudflare (ADR-0019).

```bash
export HOSTINGER_API_TOKEN=...   # hPanel → API; never commit it
cd infrastructure/terraform/lab-hostinger && cp terraform.tfvars.example terraform.tfvars   # fill the IDs
terraform init && terraform plan -out lab.plan && terraform apply lab.plan
```

Then apply `../lab-cloudflare`, copy its sensitive outputs into `/opt/amo/repo/.env` on the VPS, and start Compose.
Resource names are marked **[VERIFY]**: check them against the registry docs before the first apply — `terraform init`
fails if the provider or schema differs, which is the intended safety net. See `docs/partners/hostinger.md`.
