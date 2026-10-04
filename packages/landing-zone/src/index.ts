import type { LandingZoneProfile, MigrationIntent } from "@amo/domain";

export const SAMPLE_PROFILE: LandingZoneProfile = {
  profileId: "sample-alz-aligned",
  label: "Sample ALZ-aligned hub-and-spoke (illustrative, not validated)",
  source: "sample",
  mode: "alz-aligned",
  managementGroupId: null,
  destinationSubscriptionId: null,
  resourceGroupNaming: "rg-{workload}-{env}-{region}-{nn}",
  resourceNaming: "{abbr}-{workload}-{env}-{region}-{nn}",
  networkTopology: "hub-and-spoke",
  hubVnetId: null,
  centralFirewall: true,
  centralPrivateDns: true,
  sharedLogAnalyticsWorkspaceId: null,
  requiredTags: ["application", "environment", "owner", "cost-center"],
  allowedRegions: [],
  dataResidency: null,
  policyNotes: ["Sample profile: policies are placeholders. Real ALZ policy assignments must be inspected with an authenticated session."],
  budgetNotes: [],
};

/** Build a profile from questionnaire answers (demo) — never claims validation (§15). */
export function profileFromIntent(intent: MigrationIntent): LandingZoneProfile {
  const base = { ...SAMPLE_PROFILE, source: "questionnaire" as const, profileId: "questionnaire-derived", label: "Derived from questionnaire answers (unvalidated)" };
  base.mode = intent.existingLandingZone === true ? "existing" : intent.existingLandingZone === false ? "greenfield" : "custom";
  base.allowedRegions = intent.destinationRegion ? [intent.destinationRegion] : [];
  base.dataResidency = intent.dataResidency;
  base.requiredTags = Object.keys(intent.requiredTags).length ? Object.keys(intent.requiredTags) : SAMPLE_PROFILE.requiredTags;
  if (intent.namingPrefix) base.resourceNaming = `${intent.namingPrefix}-{abbr}-{workload}-{env}-{region}-{nn}`;
  base.policyNotes = ["Questionnaire-derived profile: nothing here has been validated against an actual landing zone."];
  return base;
}

/** Landing-zone gaps a resource decision must call out (prerequisites), from intent + profile. */
export function landingZonePrerequisites(profile: LandingZoneProfile, intent: MigrationIntent): string[] {
  const out: string[] = [];
  if (!intent.destinationRegion) out.push("Destination region not supplied — regional availability and SKU checks cannot be evaluated.");
  if (profile.mode === "greenfield") out.push("Greenfield landing zone: management group, subscription vending, hub network, central DNS and logging must exist before workload migration.");
  if (profile.mode === "existing") out.push("Existing landing zone: obtain hub VNet ID, central private DNS zone resource group and shared Log Analytics workspace ID for the destination.");
  if (intent.privateEndpointsRequired) out.push("Private endpoints required: destination VNet must reach central private DNS; recreate every private endpoint and zone group.");
  if (intent.publicAccessPolicy === "deny") out.push("Public access denied by policy: every PaaS resource needs networking rules reconstructed before data copy tools can connect.");
  if (intent.dataResidency) out.push(`Data residency '${intent.dataResidency}': confirm destination region and any geo-replication/backup secondary regions comply.`);
  return out;
}
