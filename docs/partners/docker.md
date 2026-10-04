# Docker

**What it does here.** `infrastructure/docker/Dockerfile.lab` builds a multi-stage, non-root image with no Azure SDKs;
`docker-compose.lab.yml` runs it read-only with all capabilities dropped and `no-new-privileges`. The appliance ships as a
signed image set. Digest pinning is a tracked follow-up (VALIDATION.md).
