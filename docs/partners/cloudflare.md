# Cloudflare

**What it does here.** Turnstile protects the upload step (human verification before `POST /api/assessments`); the
website's edge in front of the lab host (DNS, TLS, WAF) is the website repository's, not this one's.

**Where.** Server-side verification in `apps/lab-api/src/app.ts` (`verifyTurnstile`); the pane app `apps/lab-web` renders
the widget with the site key from `/api/health` and passes the token through `packages/ui` (`getTurnstileToken`). The
retired Tunnel edge (ADR-0019, `infrastructure/terraform/lab-cloudflare`) was deleted on 2026-10-10.

**Why.** Abuse control without accounts; the same verification provider the content site already uses.

**What the lab can publish.** Blocked/challenged request counts, rate-limit hits, Turnstile solve rate.
