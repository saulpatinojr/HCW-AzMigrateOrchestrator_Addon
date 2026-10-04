# Hybrid Cloud Works website integration

Proposed section parallel to the existing browser labs:

| Route | Content |
|---|---|
| `/education/migration-labs` | Landing: what the labs are, link to the Azure Resource Assessment lab, enterprise CTA |
| `/education/migration-labs/azure-resource-assessment` | Explainer, disclaimer, sample CSV download, "Start" |
| `/education/migration-labs/azure-resource-assessment/start` | Embeds or links the explorer (`https://migrate-demo.hybridcloudworks.com`) |
| `/education/migration-labs/azure-resource-assessment/lab` | Optional Coder-backed guided inspection lab when configured |

Integration options: (a) reverse-proxy `migrate-demo.hybridcloudworks.com` under the site's Cloudflare zone with the
same security headers; (b) embed via `<iframe>` with `frame-ancestors` relaxed to the site origin only (the API currently
sends `frame-ancestors 'none'`; change in `securityHeaders()` deliberately). The site's own frontend (React/Vite) can later
consume `/api/assessments` directly; the demo UI is intentionally framework-free so it can be replaced by site components.
