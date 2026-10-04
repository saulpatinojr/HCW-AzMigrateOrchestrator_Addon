import type { DesiredOperation } from "./taxonomy.js";

/** Questionnaire answers / migration intent (§12.1, §17). Every default is an assumption and labelled as such. */
export interface MigrationIntent {
  desiredOperation: DesiredOperation;
  destinationRegion: string | null;
  /** Optional destination scope; enables exact new-resource-ID computation for the IaC state-impact output. */
  destinationSubscriptionId: string | null;
  destinationResourceGroup: string | null;
  sameSubscription: boolean | null;
  sameTenant: boolean | null;
  existingLandingZone: boolean | null;
  environmentType: "production" | "non-production" | "mixed" | null;
  downtimeTolerance: "none" | "minutes" | "hours" | "days" | null;
  rtoHours: number | null;
  rpoMinutes: number | null;
  migrationMode: "online" | "offline" | "either" | null;
  sourceAvailableDuringSync: boolean | null;
  dataResidency: string | null;
  regulatoryRestrictions: string[];
  namingPrefix: string | null;
  requiredTags: Record<string, string>;
  applicationGroupTagKey: string | null;
  publicAccessPolicy: "allow" | "deny" | "unknown" | null;
  privateEndpointsRequired: boolean | null;
  includeDataMigrationExamples: boolean;
  /** Which answers were defaulted rather than supplied (§17 "label defaults as assumptions"). */
  assumedFields: string[];
}

export const INTENT_PROHIBITED_FIELDS = [
  "password",
  "clientSecret",
  "accessToken",
  "storageKey",
  "connectionString",
  "privateKey",
  "certificate",
] as const;

export function defaultIntent(partial: Partial<MigrationIntent> = {}): MigrationIntent {
  const base: MigrationIntent = {
    desiredOperation: "region-relocation",
    destinationRegion: null,
    destinationSubscriptionId: null,
    destinationResourceGroup: null,
    sameSubscription: true,
    sameTenant: true,
    existingLandingZone: null,
    environmentType: null,
    downtimeTolerance: "hours",
    rtoHours: null,
    rpoMinutes: null,
    migrationMode: "either",
    sourceAvailableDuringSync: true,
    dataResidency: null,
    regulatoryRestrictions: [],
    namingPrefix: null,
    requiredTags: {},
    applicationGroupTagKey: "application",
    publicAccessPolicy: "unknown",
    privateEndpointsRequired: null,
    includeDataMigrationExamples: true,
    assumedFields: [],
  };
  const merged: MigrationIntent = { ...base, ...partial, assumedFields: [] };
  const assumed: string[] = [];
  for (const k of Object.keys(base) as Array<keyof MigrationIntent>) {
    if (k === "assumedFields") continue;
    if (partial[k] === undefined || partial[k] === null) assumed.push(k);
  }
  merged.assumedFields = assumed;
  // Keep cross-tenant/subscription consistency: a different tenant implies a different subscription.
  if (merged.sameTenant === false) merged.sameSubscription = false;
  if (merged.sameTenant === false && merged.desiredOperation !== "cross-tenant-migration") {
    merged.desiredOperation = "cross-tenant-migration";
  }
  return merged;
}
