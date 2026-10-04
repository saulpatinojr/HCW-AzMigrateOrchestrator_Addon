# ADR-0020: IaC state impact, HCP-ready output, and provider-schema validation

**Status:** Accepted · **Date:** 2026-10-03

## Context
ARM moves and Resource Mover relocations assign new resource IDs. A customer managing the estate with Terraform ends up
with state pointing at IDs that no longer exist, and the next plan proposes destroying and recreating everything. Generated
Terraform also needs to be *demonstrably* valid against the real `azurerm` provider, not just plausible.

## Decision
1. Every bundle carries `terraform/state-impact/`: declarative `removed {}` (always `destroy = false`) and `import {}` blocks
   plus an imperative `state-mv.sh`, with new IDs computed when the destination scope is supplied and `__PLACEHOLDER__`
   tokens otherwise (never `${}`, which HCL would interpolate). Addresses are suggestions to be replaced from `terraform state list`.
2. Every bundle carries `terraform/hcp/`: a `tfe`-provider workspace definition (VCS-driven, `auto_apply = false`, dynamic
   Azure credentials via workload identity federation) and a `cloud.tf.example`.
3. The generator emits `argument-manifest.json`; `checkArguments` validates it against a `ProviderSchemaSource` — a
   `terraform providers schema -json` file (used in CI on the golden bundle) or the Terraform MCP server
   (`McpSchemaSource`, adapter for the IaC agent where network and MCP are available).

## Consequences
Terraform shops get the missing half of a move plan; CI now proves generated code validates and uses only real arguments;
the MCP source is an adapter until wired to a live server (VALIDATION.md).
