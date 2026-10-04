# Cross-tenant migration

Selecting "different tenant" in the questionnaire forces `desiredOperation = cross-tenant-migration` and
`sameSubscription = false`. Each rule's `crossTenantPattern` then applies. Two strategies are surfaced as a
subscription-wide prerequisite:

1. **Subscription transfer** to the destination directory (Microsoft Learn: *Transfer an Azure subscription to a
   different Microsoft Entra directory*), followed by reconstruction of tenant-bound objects.
2. **Recreate and migrate**: generated Terraform for infrastructure, separate data path per resource.

Tenant-bound objects always reconstructed: role assignments, custom roles, managed identities (new principal/client
IDs), app registrations and enterprise applications, federated credentials, Key Vault tenant ID + access policies/RBAC,
SQL Entra administrators, private DNS zones and links, certificates referencing tenant identities. Each rule lists its
own `crossTenantImplications`; the Key Vault and managed-identity rules are the strictest.
