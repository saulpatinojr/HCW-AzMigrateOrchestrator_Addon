# ADR-0019: Lab edge — Cloudflare Tunnel on a Hostinger VPS, no inbound ports

**Status:** Accepted · **Date:** 2026-10-03

## Context
The lab runs on a Hostinger KVM VPS and must be safe to expose publicly while showcasing the providers the owner promotes.

## Decision
Replace Caddy with `cloudflared` (Cloudflare Tunnel). The VPS firewall admits only SSH from the operator CIDR; TLS, WAF,
rate limiting and Turnstile live at Cloudflare and are Terraform-managed (`infrastructure/terraform/lab-cloudflare`). The
VPS is Terraform-managed with the Hostinger provider (`infrastructure/terraform/lab-hostinger`). Secrets (`TUNNEL_TOKEN`,
`TURNSTILE_SECRET`, `HOSTINGER_API_TOKEN`, `CLOUDFLARE_API_TOKEN`) exist only in environments, never in files in this repo.

## Consequences
No certificate management on the box; the attack surface is the tunnel's outbound connection; CORS and Turnstile are
enforced in `lab-api`; `lab-api` trusts `cf-connecting-ip` only because nothing reaches it except through the tunnel.
