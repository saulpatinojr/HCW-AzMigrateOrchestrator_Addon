import type { EvidenceState } from "./taxonomy.js";

/** Provenance for each normalized field (§16). */
export interface FieldProvenance {
  originalHeader?: string;
  normalizedHeader: string;
  originalValue?: string;
  normalizedValue: string | null;
  transformation: string;
  evidence: EvidenceState;
  warnings?: string[];
}

/** Parsed Azure resource ID. */
export interface ParsedResourceId {
  subscriptionId?: string;
  resourceGroup?: string;
  provider?: string;
  /** e.g. "virtualMachines" or "virtualNetworks/subnets" */
  typePath?: string;
  /** fully-qualified type: "Microsoft.Compute/virtualMachines" */
  fullType?: string;
  name?: string;
  parentId?: string;
  valid: boolean;
  issues: string[];
}

export interface NormalizedResource {
  /** Stable key within an assessment: the lowercase resource ID when valid, else a synthetic key. */
  key: string;
  resourceId: string | null;
  name: string;
  /** Fully-qualified, canonical-cased provider type, e.g. Microsoft.Compute/virtualMachines */
  type: string;
  provider: string;
  resourceGroup: string | null;
  location: string | null;
  subscriptionName: string | null;
  subscriptionId: string | null;
  kind: string | null;
  sku: string | null;
  status: string | null;
  tags: Record<string, string>;
  parsedId: ParsedResourceId;
  provenance: FieldProvenance[];
  /** Row-level warnings (duplicates, invalid id, formula-like content, ...). */
  warnings: string[];
  sourceRow: number;
}

export interface IngestionResult {
  resources: NormalizedResource[];
  warnings: string[];
  errors: string[];
  /** sha256 of the normalized input bytes */
  inputHash: string;
  rowCount: number;
  duplicateCount: number;
  headerMap: Record<string, string | null>;
  missingColumns: string[];
  extraColumns: string[];
}
