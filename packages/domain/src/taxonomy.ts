/**
 * Azure migration decision taxonomy (requirement §8).
 * One primary disposition per resource, optional secondary actions.
 */
export const DISPOSITIONS = [
  "native-move",
  "orchestrated-migration",
  "recreate-and-migrate",
  "recreate-only",
  "retain",
  "retire",
  "replace",
  "redesign",
  "unknown-requires-validation",
] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

/** Per-dimension disposition (§3 principle 3: infrastructure, identity, configuration and data are separate). */
export const DIMENSION_DISPOSITIONS = [
  "move-with-resource",
  "recreate",
  "reconstruct",
  "replicate",
  "backup-restore",
  "export-import",
  "sync-and-cutover",
  "not-applicable",
  "retain-in-source",
  "unknown",
] as const;
export type DimensionDisposition = (typeof DIMENSION_DISPOSITIONS)[number];

/** Evidence state labels every demo conclusion must carry (§16). */
export const EVIDENCE_STATES = [
  "observed-from-csv",
  "derived-from-resource-id",
  "inferred-from-type",
  "user-supplied",
  "general-rule",
  "observed-from-azure-api",
  "missing",
  "requires-authenticated-validation",
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const SUPPORT_STATES = ["supported", "conditional", "unsupported", "unknown"] as const;
export type SupportState = (typeof SUPPORT_STATES)[number];

export const CONFIDENCE_BANDS = ["low", "medium", "high"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export interface Confidence {
  /** 0..1 */
  score: number;
  band: ConfidenceBand;
  /** Why the score is what it is — always evidence-derived (§3 principle 8). */
  rationale: string[];
}

export function bandFor(score: number): ConfidenceBand {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

/** Migration tools and mechanisms the rules may recommend. */
export const MIGRATION_TOOLS = [
  "arm-move",
  "azure-resource-mover",
  "azure-migrate",
  "azure-site-recovery",
  "azure-database-migration-service",
  "native-database-replication",
  "geo-replication",
  "failover-group",
  "backup-and-restore",
  "export-and-import",
  "azure-storage-mover",
  "azcopy",
  "object-replication",
  "azure-data-factory",
  "data-box",
  "application-deployment",
  "slot-deployment",
  "container-image-copy",
  "service-specific-migration",
  "terraform-redeploy",
  "manual-reconstruction",
  "none",
] as const;
export type MigrationTool = (typeof MIGRATION_TOOLS)[number];

/** Operations a caller may be requesting (§1). */
export const DESIRED_OPERATIONS = [
  "resource-group-move",
  "subscription-move",
  "region-relocation",
  "cross-tenant-migration",
  "modernization",
  "disaster-recovery",
] as const;
export type DesiredOperation = (typeof DESIRED_OPERATIONS)[number];
