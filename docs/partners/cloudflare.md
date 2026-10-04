# Cloudflare

**What it does here.** Terminates TLS and fronts the lab API through a Tunnel; applies the Managed WAF ruleset; rate-limits
`POST /api/assessments`; Turnstile protects the upload step.

**Where.** `infrastructure/terraform/lab-cloudflare/` (tunnel, DNS, rulesets, widget); `cloudflared` service in
`docker-compose.lab.yml`; server-side verification in `apps/lab-api/src/app.ts` (`verifyTurnstile`); the site renders the
widget and passes the token through `packages/ui` (`getTurnstileToken`).

**Why.** Zero inbound ports on the VPS; abuse control without accounts; the same edge the content site already uses.

**What the lab can publish.** Blocked/challenged request counts, rate-limit hits, Turnstile solve rate.
