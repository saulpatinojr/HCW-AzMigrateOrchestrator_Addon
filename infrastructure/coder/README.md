# Coder guided lab (`amo-guided-lab`)

`template/main.tf` is a Coder template that provisions a per-user, isolated Docker workspace on the shared, digest-pinned `docker.io/hybridcloudworks/hcw-lab` image through `tcp://coder-docker-proxy:2375` (ADR-0032 / LAB-5 boundary), downloads one assessment bundle from the lab API with a single-use `x-bundle-token` via `/usr/local/libexec/hcw-boot/hcw-boot migration-assessment` (with an inline `python3 -m zipfile -e` fallback), and opens `code-server` on `/tmp/home/assessment`.

Required template variables: `demo_api_base_url`. Ephemeral workspace parameters: `assessment_id`, `bundle_token`.

See [`docs/deployment/coder.md`](../../docs/deployment/coder.md) for deployment and verification steps.
