# Monitoring

- The demo API logs structured JSON to stderr (`@amo/observability`), redacted and content-free; Caddy logs JSON to stdout. Ship both with the VPS's journald/Vector/Promtail agent.
- `/api/health` is the liveness probe (also used by the container HEALTHCHECK).
- OpenTelemetry: the logger's attribute names are OTel-compatible; attach an exporter in `packages/observability` when a collector is available (ADR-0014). Not wired in this build.
- Alerts to configure on the VPS: container restart loop, 5xx rate > 5 % over 5 min, TLS certificate renewal failure (Caddy), disk > 80 %.
