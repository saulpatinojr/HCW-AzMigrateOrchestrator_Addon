import type {
  Confidence,
  DesiredOperation,
  DimensionDisposition,
  Disposition,
  EvidenceState,
  MigrationTool,
  SupportState,
} from "./taxonomy.js";
import type { Edition } from "./edition.js";

export interface EvidenceItem {
  state: EvidenceState;
  statement: string;
  source?: string;
  /** ISO date the evidence was retrieved/observed */
  date?: string;
  ruleId?: string;
}

export interface Dependency {
  targetKey: string;
  targetType?: string;
  relationship: "parent" | "child" | "hard" | "soft" | "shared-service" | "identity" | "network" | "dns" | "data-flow";
  /** discovered (observed) vs inferred (§12.5) */
  origin: "discovered" | "inferred";
  note?: string;
}

export interface GeneratedArtifactRef {
  path: string;
  kind: "terraform" | "powershell" | "azure-cli" | "runbook" | "validation" | "report" | "evidence";
  production: false;
}

/** Resource decision record (§9). */
export interface ResourceDecisionRecord {
  resourceKey: string;
  resourceId: string | null;
  displayName: string;
  provider: string;
  resourceType: string;
  parentResource: string | null;
  childResources: string[];
  resourceGroup: string | null;
  subscriptionName: string | null;
  subscriptionId: string | null;
  tenantContext: "same-tenant" | "cross-tenant" | "unknown";
  region: string | null;
  availabilityZone: string | null;
  sku: string | null;
  kind: string | null;
  tags: Record<string, string>;
  applicationGroup: string | null;
  dependencyGroup: string | null;
  sourceScope: string | null;
  destinationScope: string | null;
  desiredOperation: DesiredOperation;

  nativeMoveSupport: SupportState;
  regionalRelocationSupport: SupportState;
  crossSubscriptionSupport: SupportState;
  crossTenantImplications: string[];
  targetRegionAvailability: SupportState;
  targetSkuAvailability: SupportState;

  disposition: Disposition;
  secondaryActions: string[];
  infrastructureDisposition: DimensionDisposition;
  configurationDisposition: DimensionDisposition;
  identityDisposition: DimensionDisposition;
  dataDisposition: DimensionDisposition;

  recommendedTool: MigrationTool;
  alternativeMethods: MigrationTool[];
  reasonCodes: string[];

  dependencies: Dependency[];
  sequencePosition: number | null;
  expectedDowntime: "none" | "minutes" | "hours" | "unknown";
  rtoCompatibility: SupportState;
  rpoCompatibility: SupportState;

  prerequisites: string[];
  blockers: string[];
  risks: string[];
  mitigations: string[];
  validationMethod: string[];
  rollbackMethod: string[];
  generatedArtifacts: GeneratedArtifactRef[];

  evidence: EvidenceItem[];
  evidenceDate: string;
  ruleId: string | null;
  ruleVersion: string | null;
  confidence: Confidence;
  /** Confidence for each operation the rule covers, independent of the requested one (ADR-0018). */
  confidenceByOperation: Record<DesiredOperation, Pick<Confidence, "score" | "band">>;
  assumptions: string[];
  missingInformation: string[];
  humanApprovalRequired: boolean;
  implementationStatus: "planned" | "requires-validation" | "blocked" | "not-applicable";
}

export interface WavePlan {
  waves: Array<{
    number: number;
    name: string;
    resourceKeys: string[];
    entryCriteria: string[];
    exitCriteria: string[];
    rationale: string;
  }>;
  notes: string[];
}

export interface AssessmentSummary {
  resourceCount: number;
  dispositionTotals: Record<Disposition, number>;
  unknownCount: number;
  confidenceTotals: Record<"low" | "medium" | "high", number>;
  complexityBand: "low" | "medium" | "high";
  keyBlockers: string[];
  disclaimers: string[];
}

export interface Assessment {
  id: string;
  edition: Edition;
  createdAt: string;
  expiresAt: string | null;
  inputHash: string;
  rulesVersion: string;
  rulesChecksum: string;
  applicationVersion: string;
  authenticated: boolean;
  intent: import("./intent.js").MigrationIntent;
  summary: AssessmentSummary;
  decisions: ResourceDecisionRecord[];
  wavePlan: WavePlan;
  ingestionWarnings: string[];
  safetyFindings: string[];
  progress: ProgressEvent[];
}

export interface ProgressEvent {
  at: string;
  agent: string;
  message: string;
  status: "started" | "completed" | "skipped" | "failed";
}
