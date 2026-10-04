/** Landing-zone profile shared by both editions (§15). */
export interface LandingZoneProfile {
  profileId: string;
  label: string;
  /** demo profiles are never claimed to be validated */
  source: "sample" | "questionnaire" | "authenticated-inspection";
  mode: "existing" | "greenfield" | "alz-aligned" | "custom";
  managementGroupId: string | null;
  destinationSubscriptionId: string | null;
  resourceGroupNaming: string;
  resourceNaming: string;
  networkTopology: "hub-and-spoke" | "virtual-wan" | "flat" | "unknown";
  hubVnetId: string | null;
  centralFirewall: boolean | null;
  centralPrivateDns: boolean | null;
  sharedLogAnalyticsWorkspaceId: string | null;
  requiredTags: string[];
  allowedRegions: string[];
  dataResidency: string | null;
  policyNotes: string[];
  budgetNotes: string[];
}
