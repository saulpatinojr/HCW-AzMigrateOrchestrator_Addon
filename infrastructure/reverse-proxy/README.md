# Edge

> **Retired 2026-10-10: superseded by the website repository's `addons` Ansible role; not applied to the existing host. Kept only until the follow-up pull request deletes this directory.**

The AddOn runs on the website's lab host behind that host's Caddy: `migration.lab.hybridcloudworks.com` is reverse-proxied to
the container on `127.0.0.1:18081`, TLS and the site-only `frame-ancestors` come from the host's Caddy configuration, and
the host's 503 body reads the one unavailable sentence. The container sets `AMO_TRUST_PROXY=1` so the first
`X-Forwarded-For` value, which only that Caddy can set, is the client address. See `docs/deployment/lab-host.md`.
The former Cloudflare Tunnel edge (ADR-0019) and its Terraform in `../terraform/lab-cloudflare` are retired.
