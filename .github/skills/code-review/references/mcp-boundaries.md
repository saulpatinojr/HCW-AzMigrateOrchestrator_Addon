# MCP evidence boundaries

Use MCP only to verify claims that the configured server can actually establish.

## Repository MCP configuration

The provided configuration includes Microsoft Learn, Cloudflare documentation, Terraform registry/provider information, read-only Azure control-plane reads, and a read-only GitHub MCP server. Treat the checked-in JSON as configuration source; GitHub.com repository MCP settings must still be configured by a repository administrator.

## Review-mode rules

- Prefer the built-in/read-only GitHub MCP server for PR metadata, checks, workflow logs, code scanning, Dependabot, commits, files, and related repository evidence.
- Use documentation MCP servers for current vendor semantics, not as proof of deployed state.
- Use Terraform registry/provider MCP data for provider/module schema and version questions, not as a Terraform plan.
- Use Azure read-only tools only for control-plane facts the tool exposes. Do not infer data-plane contents or future plan behavior.
- Never claim access to HCP Terraform state, Key Vault secret values, Cosmos document contents, Cloudflare account secrets, or other resources not exposed by the configured tools.
- A missing MCP server/tool is an evidence limitation, not a code defect.
- For code review, require tool `readOnlyHint: true`; tools lacking that annotation may be omitted by GitHub even if listed in configuration.
- Cite or name the evidence source in the finding when MCP materially supports the conclusion.

## Repository-specific routing

| Diff area | Prefer | Question answered |
| --- | --- | --- |
| `infra/**` | Terraform registry/provider tools | Provider/module arguments, pinned-version schema, replacement-sensitive semantics |
| `functions/**`, `frontend/**` auth/SWA, Azure resources in `infra/**` | Microsoft Learn | Current Azure Functions, Cosmos DB, Key Vault, Static Web Apps, Entra/MSAL, App Insights behavior |
| `edge/**`, Cloudflare resources | Cloudflare docs | Workers, cron, DNS, edge-rule semantics |
| Live Azure infrastructure | Read-only Azure tools | What exists now at the control plane; never what a future Terraform plan would do |
| Red CI / GitHub findings | Read-only GitHub tools | Workflow run/job evidence, code scanning, Dependabot, commit/file/PR metadata |

When a live read materially supports a finding, record the source and observation time.
