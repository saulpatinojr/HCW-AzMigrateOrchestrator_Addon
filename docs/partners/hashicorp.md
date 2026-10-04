# HashiCorp

**What it does here.** Terraform is both an output and an input: the engine generates modular Terraform scaffolding for every
resource that must be recreated (`packages/terraform-generator`), and the lab's own infrastructure is Terraform
(`infrastructure/terraform/lab-hostinger`, `lab-cloudflare`, `infrastructure/coder/template`).

**Sprint 2 delivered (ADR-0020).** IaC state-impact output (`removed`/`import` blocks, `state-mv.sh`) because ARM moves change
resource IDs; HCP Terraform-ready bundles (`tfe` workspace with manual apply and dynamic Azure credentials); argument
validation of generated code against the real provider schema in CI, with a Terraform MCP adapter for the IaC agent.

**What the lab can publish.** Share of generated bundles that pass `terraform validate` in CI; module usage counts.
