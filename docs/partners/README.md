# Partner showcase

One page per provider: what it does in this system, where the code is, and what the lab can publish about it. These
pages back the "Powered by" panel in `packages/ui` (`PARTNERS`) and are written for sponsorship conversations — every claim
points at a file in this repository.

| Provider | Role in the lab | Role in the appliance |
|---|---|---|
| [Microsoft](microsoft.md) | Rule corpus from Microsoft Learn; Azure resource model | Entra sign-in, Resource Graph, `validateMoveResources`, Resource Mover |
| [Hostinger](hostinger.md) | Hosts the lab API (KVM VPS, Terraform-provisioned) | — |
| [Cloudflare](cloudflare.md) | Tunnel, WAF, rate limit, Turnstile | Optional Access in front of the appliance UI |
| [HashiCorp](hashicorp.md) | Generated Terraform; lab infrastructure as code | HCP Terraform-ready output; state-impact generator (Sprint 2) |
| [GitHub](github.md) | Copilot review pack, Actions, GHCR with attestations | Same |
| [Coder](coder.md) | Guided inspection lab | — |
| [Docker](docker.md) | Hardened containers for the lab | Appliance image set |
