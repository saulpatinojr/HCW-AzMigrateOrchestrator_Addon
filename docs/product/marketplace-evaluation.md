# Azure Marketplace evaluation (appliance)

**Question.** Should the appliance be listed on Azure Marketplace, and as what?

| Offer type | Fit | Notes |
|---|---|---|
| **Azure Application – Managed Application** | Best medium-term fit | Customer deploys into their tenant from a definition we publish (the `appliance-azure` Terraform would be ported to Bicep/ARM for the mainTemplate); we retain limited management via JIT access; the identity model (managed identity, Reader by default, per-engagement execution RBAC) maps directly. |
| Azure Application – Solution Template | Acceptable | Same template, no publisher management; simpler, less operability. |
| Azure Container Offer (AKS) | Poor | Appliance targets Container Apps, not AKS; would force a Helm chart. |
| SaaS Offer | Not yet | Would mean we host multi-tenant; conflicts with "data stays in the customer's tenant" positioning. |

**Prerequisites before any listing**
1. Real-tenant validation of Sprint 3 (Entra, Resource Graph, `validateMoveResources`, Resource Mover) and PostgreSQL token auth.
2. Partner Center account, publisher verification, Microsoft Entra app publisher verification for multi-tenant sign-in.
3. mainTemplate (Bicep → ARM JSON) equivalent of `infrastructure/terraform/appliance-azure`, `createUiDefinition.json` for the deployment wizard (tenant, scopes, app roles).
4. Image signing verified by the template (digest pins), SBOM published, security review of the Container App ingress.
5. Pricing model: free appliance + paid engagements (Hybrid Cloud Works services) is the simplest first listing; metered billing can follow.

**Recommendation.** Defer listing until two customer engagements have run the appliance in anger. Prepare the Managed Application
path now by keeping the Terraform resource set small and translatable, which it is.
