# Coder browser lab

`template/` is a Coder template that starts a per-user Docker workspace, downloads one assessment bundle from the
demo API with a one-time owner token, and opens VS Code (code-server) on it. The engine talks to Coder only
through `@amo/workspace-provider` (ADR-0010).

Required variables: `demo_api_base_url`. Template parameters: `assessment_id`, `bundle_token` (ephemeral).

Deployment checklist (docs/deployment/coder.md): Coder behind the same Caddy as the demo (`coder.<domain>`), GitHub
OAuth for sign-in, workspace TTL ≤ 4 h with idle shutdown, quota 1 workspace/user, image built from
`ghcr.io/saulpatinojr/amo-lab-workspace` (code-server, terraform, PowerShell, Azure CLI — **no credentials**).
Not validated against a live Coder deployment in this build (VALIDATION.md).
