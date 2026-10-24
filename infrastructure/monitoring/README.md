# Monitoring

- The lab API logs structured JSON to stderr (`@hybridcloudworks/migration-core/observability`), redacted and content-free; Caddy logs JSON to stdout.
- `/api/health` is the liveness probe (also used by the container `HEALTHCHECK` and the website's status proxy).
- OpenTelemetry: the logger's attribute names are OTel-compatible; exporter wiring belongs upstream in `saulpatinojr/HCW-MigrateOrchestrator_App`.
- Recommended lab-host alerts: container restart loop, 5xx rate > 5% over 5 min, TLS certificate renewal failure (Caddy), disk > 80%.
