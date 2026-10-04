/** Header alias map for Azure portal "All resources" exports and common variants (§16). */
export const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "resource name", "resourcename", "resource"],
  type: ["type", "resource type", "resourcetype", "resource_type"],
  resourceGroup: ["resource group", "resourcegroup", "resource_group", "rg", "resource group name"],
  location: ["location", "region", "azure region"],
  subscriptionName: ["subscription", "subscription name", "subscriptionname"],
  subscriptionId: ["subscription id", "subscriptionid", "subscription_id"],
  resourceId: ["resource id", "resourceid", "resource_id", "id"],
  tags: ["tags", "tag"],
  kind: ["kind"],
  sku: ["sku", "sku name", "sku_name", "tier", "pricing tier"],
  status: ["status", "state", "provisioning state", "provisioningstate"],
};

export const REQUIRED_COLUMNS = ["name", "type"] as const;
export const EXPECTED_COLUMNS = Object.keys(HEADER_ALIASES);

export function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function mapHeaders(headers: string[]): { map: Record<string, string | null>; extra: string[]; missing: string[] } {
  const map: Record<string, string | null> = {};
  for (const k of EXPECTED_COLUMNS) map[k] = null;
  const extra: string[] = [];
  for (const h of headers) {
    const n = normalizeHeader(h);
    let matched = false;
    for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[canon] === null && aliases.includes(n)) {
        map[canon] = h;
        matched = true;
        break;
      }
    }
    if (!matched) extra.push(h);
  }
  const missing = EXPECTED_COLUMNS.filter((c) => map[c] === null);
  return { map, extra, missing };
}

/** Canonical casing for well-known resource provider types. The CSV export often lowercases types. */
const CANONICAL_TYPES: Record<string, string> = Object.fromEntries(
  [
    "Microsoft.Compute/virtualMachines",
    "Microsoft.Compute/disks",
    "Microsoft.Compute/snapshots",
    "Microsoft.Compute/images",
    "Microsoft.Compute/availabilitySets",
    "Microsoft.Compute/virtualMachineScaleSets",
    "Microsoft.Compute/virtualMachines/extensions",
    "Microsoft.Network/networkInterfaces",
    "Microsoft.Network/virtualNetworks",
    "Microsoft.Network/virtualNetworks/subnets",
    "Microsoft.Network/networkSecurityGroups",
    "Microsoft.Network/publicIPAddresses",
    "Microsoft.Network/loadBalancers",
    "Microsoft.Network/applicationGateways",
    "Microsoft.Network/azureFirewalls",
    "Microsoft.Network/routeTables",
    "Microsoft.Network/natGateways",
    "Microsoft.Network/privateEndpoints",
    "Microsoft.Network/privateDnsZones",
    "Microsoft.Network/virtualNetworkGateways",
    "Microsoft.Network/networkWatchers",
    "Microsoft.Web/serverFarms",
    "Microsoft.Web/sites",
    "Microsoft.Web/sites/slots",
    "Microsoft.Web/staticSites",
    "Microsoft.Storage/storageAccounts",
    "Microsoft.KeyVault/vaults",
    "Microsoft.Sql/servers",
    "Microsoft.Sql/servers/databases",
    "Microsoft.Sql/servers/elasticPools",
    "Microsoft.Sql/managedInstances",
    "Microsoft.DBforPostgreSQL/flexibleServers",
    "Microsoft.DBforMySQL/flexibleServers",
    "Microsoft.DocumentDB/databaseAccounts",
    "Microsoft.Cache/Redis",
    "Microsoft.ContainerRegistry/registries",
    "Microsoft.ContainerService/managedClusters",
    "Microsoft.App/containerApps",
    "Microsoft.App/managedEnvironments",
    "Microsoft.OperationalInsights/workspaces",
    "Microsoft.Insights/components",
    "Microsoft.Insights/actionGroups",
    "Microsoft.Insights/metricAlerts",
    "Microsoft.Insights/scheduledQueryRules",
    "Microsoft.RecoveryServices/vaults",
    "Microsoft.DataProtection/backupVaults",
    "Microsoft.ManagedIdentity/userAssignedIdentities",
    "Microsoft.ServiceBus/namespaces",
    "Microsoft.EventHub/namespaces",
    "Microsoft.EventGrid/topics",
    "Microsoft.DataFactory/factories",
    "Microsoft.Logic/workflows",
    "Microsoft.ApiManagement/service",
    "Microsoft.Resources/resourceGroups",
    "Microsoft.Portal/dashboards",
    "Microsoft.AlertsManagement/smartDetectorAlertRules",
  ].map((t) => [t.toLowerCase(), t]),
);

export function canonicalType(t: string): string {
  const trimmed = t.trim().replace(/\s+/g, "");
  return CANONICAL_TYPES[trimmed.toLowerCase()] ?? trimmed;
}

/** Portal exports write tags as `key: value; key2: value2` or JSON. */
export function parseTags(raw: string | undefined | null): { tags: Record<string, string>; transformation: string } {
  if (!raw || !raw.trim()) return { tags: {}, transformation: "empty" };
  const s = raw.trim();
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      const tags: Record<string, string> = {};
      for (const [k, v] of Object.entries(o)) tags[k] = String(v ?? "");
      return { tags, transformation: "json" };
    } catch {
      return { tags: {}, transformation: "json-parse-failed" };
    }
  }
  const tags: Record<string, string> = {};
  for (const part of s.split(/;|\n/)) {
    const idx = part.indexOf(":");
    const eq = part.indexOf("=");
    const sep = idx === -1 ? eq : eq === -1 ? idx : Math.min(idx, eq);
    if (sep === -1) continue;
    const k = part.slice(0, sep).trim();
    const v = part.slice(sep + 1).trim();
    if (k) tags[k] = v;
  }
  return { tags, transformation: "key-value-list" };
}
