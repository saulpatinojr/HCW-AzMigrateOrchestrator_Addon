# Edge

The lab has no reverse proxy on the VPS. Cloudflare Tunnel (`cloudflared` in `docker-compose.lab.yml`) connects outbound
to Cloudflare, which terminates TLS, applies WAF/rate limiting and routes `labs-api.hybridcloudworks.com` to `lab-api:8080`.
The Cloudflare side (DNS, tunnel, ingress, WAF, rate limit, Turnstile widget, Access) is Terraform in
`infrastructure/terraform/lab-cloudflare/`. The previous Caddy setup was removed in ADR-0019.
