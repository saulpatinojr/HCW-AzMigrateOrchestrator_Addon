# Deploy the demo to a VPS

Prerequisites: a Linux VPS with Docker, a DNS A record for your demo domain, ports 80/443 open.

```bash
git clone https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_Addon /opt/amo && cd /opt/amo
echo "DEMO_DOMAIN=migrate-demo.hybridcloudworks.com" > .env
docker compose -f docker-compose.lab.yml up -d --build
curl -s https://migrate-demo.hybridcloudworks.com/api/health
```

Caddy terminates TLS (Let's Encrypt) and forwards to the API; the API container is read-only, non-root, capability-less,
and keeps everything in memory. Upgrade: `git pull && docker compose -f docker-compose.lab.yml up -d --build`.
Rollback: `git checkout <previous-tag>` and repeat. Terraform for provisioning the VPS itself: `infrastructure/terraform/lab-hostinger`.

PowerShell equivalent (from a Windows operator box with Docker Desktop and SSH): `ssh ops@migrate-demo.hybridcloudworks.com "cd /opt/amo && git pull && docker compose -f docker-compose.lab.yml up -d --build"`.
