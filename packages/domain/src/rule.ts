import type { DimensionDisposition, Disposition, MigrationTool, SupportState } from "./taxonomy.js";

/** A versioned, evidence-backed support rule (§11). Rules live as JSON under /rules. */
export interface MigrationRule {
  ruleId: string;
  ruleVersion: string;
  provider: string;
  resourceType: string;
  applicableApiVersions?: string[];
  relevantSku?: string[];
  tier?: string[];
  operatingSystemConstraints?: string[];
  featureConstraints?: string[];
  /** Scope pairs this rule applies to. */
  sourceScope: Array<"resource-group" | "subscription" | "region" | "tenant">;
  destinationScope: Array<"resource-group" | "subscription" | "region" | "tenant">;
  sourceRegion?: string[] | "any";
  destinationRegion?: string[] | "any";
  tenantApplicability: "same-tenant" | "cross-tenant" | "any";
  support: {
    resourceGroupMove: SupportState;
    subscriptionMove: SupportState;
    regionRelocation: SupportState;
    crossTenant: SupportState;
  };
  recommendedPattern: {
    disposition: Disposition;
    tool: MigrationTool;
    infrastructure: DimensionDisposition;
    configuration: DimensionDisposition;
    identity: DimensionDisposition;
    data: DimensionDisposition;
    expectedDowntime: "none" | "minutes" | "hours" | "unknown";
  };
  /** Pattern used when the desired operation is cross-tenant and the native path is unsupported. */
  crossTenantPattern?: MigrationRule["recommendedPattern"];
  /** Pattern used for region relocation when it differs from the default. */
  regionRelocationPattern?: MigrationRule["recommendedPattern"];
  alternatives: MigrationTool[];
  documentationSources: Array<{ title: string; url: string; retrievedOn: string }>;
  reviewDate: string;
  confidence: number;
  exceptions?: string[];
  requiredEvidence: string[];
  humanReviewRequired: boolean;
  prerequisites?: string[];
  risks?: string[];
  mitigations?: string[];
  validation?: string[];
  rollback?: string[];
  crossTenantImplications?: string[];
  /** Higher precedence wins when two rules match the same resource; organizational overlays default to 100. */
  precedence?: number;
  notes?: string[];
}

export interface RuleSnapshot {
  snapshotVersion: string;
  createdAt: string;
  ruleCount: number;
  /** sha256 over the canonical JSON of all rules, sorted by ruleId */
  checksum: string;
  files: Array<{ path: string; sha256: string; ruleIds: string[] }>;
}
