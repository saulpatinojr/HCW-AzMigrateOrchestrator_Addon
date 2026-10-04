import type { NormalizedResource } from "@amo/domain";

/**
 * Discovery provider interface (§12.3). The enterprise edition implements this with Azure Resource Graph
 * + service APIs; the demo edition never instantiates an Azure-backed provider (ADR-0008).
 */
export interface DiscoveryScope {
  kind: "management-group" | "subscription" | "resource-group";
  id: string;
}
export interface DiscoveryResult {
  resources: NormalizedResource[];
  partialVisibility: string[];
  permissionGaps: string[];
  retrievedAt: string;
}
export interface DiscoveryProvider {
  readonly name: string;
  readonly authenticated: boolean;
  discover(scope: DiscoveryScope): Promise<DiscoveryResult>;
}

/** Fixture-backed provider for tests and local enterprise development. */
export class FixtureDiscoveryProvider implements DiscoveryProvider {
  readonly name = "fixture";
  readonly authenticated = false;
  constructor(private readonly resources: NormalizedResource[], private readonly gaps: string[] = []) {}
  async discover(scope: DiscoveryScope): Promise<DiscoveryResult> {
    const filtered = scope.kind === "resource-group" ? this.resources.filter((r) => (r.resourceGroup ?? "").toLowerCase() === scope.id.toLowerCase()) : scope.kind === "subscription" ? this.resources.filter((r) => (r.subscriptionId ?? "").toLowerCase() === scope.id.toLowerCase()) : this.resources;
    return { resources: filtered, partialVisibility: ["fixture data: no live enrichment"], permissionGaps: this.gaps, retrievedAt: new Date().toISOString() };
  }
}

/**
 * Azure Resource Graph provider — interface only in this build. Instantiation requires explicit
 * enterprise configuration; the class throws until the Azure SDK adapter is implemented (VALIDATION.md).
 */
export class AzureResourceGraphDiscoveryProvider implements DiscoveryProvider {
  readonly name = "azure-resource-graph";
  readonly authenticated = true;
  constructor(private readonly config: { tenantId: string; credentialKind: "managed-identity" | "workload-identity-federation" | "delegated" | "azure-cli" }) {
    if (!config.tenantId) throw new Error("tenantId required");
  }
  async discover(): Promise<DiscoveryResult> {
    throw new Error(`use ResourceGraphDiscoveryProvider with a TokenCredential (credential kind: ${this.config.credentialKind}); this placeholder is retained for the demo boundary test`);
  }
}

/** Guard used by the demo edition: refuses to construct any authenticated provider. */
export function assertDemoCannotUseAzure(provider: DiscoveryProvider, edition: "demo" | "enterprise"): void {
  if (edition === "demo" && provider.authenticated) throw new Error("demo edition must never use an authenticated Azure discovery provider");
}

// The Azure Resource Graph, ARM validateMoveResources and scope-inventory clients live in `@amo/azure-arm`
// (repository saulpatinojr/HCW-AzMigrateOrchestrator_App). This package stays interface-only so the lab can never reach Azure (ADR-0008, ADR-0027).
