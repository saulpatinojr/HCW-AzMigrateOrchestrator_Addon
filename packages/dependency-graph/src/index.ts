import type { Dependency, NormalizedResource } from "@amo/domain";

/**
 * Dependency mapping (§12.5). From a CSV we can *discover* only parent/child (via resource IDs);
 * everything else is *inferred* from type and co-location and is labelled as such.
 */
const INFERRED_EDGES: Array<{ from: string; to: string; relationship: Dependency["relationship"]; note: string }> = [
  { from: "microsoft.compute/virtualmachines", to: "microsoft.network/networkinterfaces", relationship: "hard", note: "VMs attach NICs; the NIC must exist in the destination VNet first" },
  { from: "microsoft.compute/virtualmachines", to: "microsoft.compute/disks", relationship: "hard", note: "OS/data disks move with the VM" },
  { from: "microsoft.compute/virtualmachines", to: "microsoft.compute/availabilitysets", relationship: "soft", note: "availability set membership is set at VM creation" },
  { from: "microsoft.network/networkinterfaces", to: "microsoft.network/virtualnetworks", relationship: "network", note: "NIC lives in a subnet of the VNet" },
  { from: "microsoft.network/networkinterfaces", to: "microsoft.network/networksecuritygroups", relationship: "network", note: "NSG may be associated to the NIC or subnet" },
  { from: "microsoft.network/networkinterfaces", to: "microsoft.network/publicipaddresses", relationship: "network", note: "public IP may be bound to the NIC" },
  { from: "microsoft.network/loadbalancers", to: "microsoft.network/publicipaddresses", relationship: "network", note: "frontend IP configuration" },
  { from: "microsoft.network/loadbalancers", to: "microsoft.network/virtualnetworks", relationship: "network", note: "internal frontend in a subnet" },
  { from: "microsoft.network/privateendpoints", to: "microsoft.network/virtualnetworks", relationship: "network", note: "private endpoint NIC lives in a subnet" },
  { from: "microsoft.network/privateendpoints", to: "microsoft.network/privatednszones", relationship: "dns", note: "zone group writes A records" },
  { from: "microsoft.web/sites", to: "microsoft.web/serverfarms", relationship: "parent", note: "an app belongs to an App Service plan" },
  { from: "microsoft.web/sites", to: "microsoft.storage/storageaccounts", relationship: "soft", note: "Function Apps require a storage account (kind contains functionapp)" },
  { from: "microsoft.web/sites", to: "microsoft.insights/components", relationship: "soft", note: "Application Insights connection string in app settings" },
  { from: "microsoft.web/sites", to: "microsoft.keyvault/vaults", relationship: "identity", note: "app settings commonly use Key Vault references" },
  { from: "microsoft.web/sites", to: "microsoft.managedidentity/userassignedidentities", relationship: "identity", note: "user-assigned identity may be bound to the app" },
  { from: "microsoft.insights/components", to: "microsoft.operationalinsights/workspaces", relationship: "hard", note: "workspace-based Application Insights" },
  { from: "microsoft.sql/servers/databases", to: "microsoft.sql/servers", relationship: "parent", note: "database belongs to logical server" },
  { from: "microsoft.recoveryservices/vaults", to: "microsoft.compute/virtualmachines", relationship: "soft", note: "vault may protect VMs; protection must be stopped before VM move" },
  { from: "microsoft.insights/metricalerts", to: "microsoft.insights/actiongroups", relationship: "soft", note: "alert actions reference action groups" },
];

export function mapDependencies(resources: NormalizedResource[]): Map<string, Dependency[]> {
  const out = new Map<string, Dependency[]>();
  const byId = new Map<string, NormalizedResource>();
  for (const r of resources) if (r.resourceId) byId.set(r.resourceId.toLowerCase(), r);
  const byTypeAndRg = new Map<string, NormalizedResource[]>();
  for (const r of resources) {
    const k = `${r.type.toLowerCase()}|${(r.resourceGroup ?? "").toLowerCase()}`;
    byTypeAndRg.set(k, [...(byTypeAndRg.get(k) ?? []), r]);
  }
  for (const r of resources) {
    const deps: Dependency[] = [];
    // discovered: parent/child from IDs
    if (r.parsedId.parentId) {
      const parent = byId.get(r.parsedId.parentId.toLowerCase());
      deps.push({ targetKey: parent?.key ?? r.parsedId.parentId.toLowerCase(), targetType: parent?.type, relationship: "parent", origin: "discovered", note: parent ? "parent present in inventory" : "parent not present in inventory" });
    }
    for (const other of resources) if (other.parsedId.parentId && other.parsedId.parentId.toLowerCase() === (r.resourceId ?? "").toLowerCase()) deps.push({ targetKey: other.key, targetType: other.type, relationship: "child", origin: "discovered" });
    // inferred: same resource group + type-level edges
    for (const edge of INFERRED_EDGES) {
      if (r.type.toLowerCase() !== edge.from) continue;
      if (edge.from === "microsoft.web/sites" && edge.to === "microsoft.storage/storageaccounts" && !/functionapp/i.test(r.kind ?? "")) continue;
      const candidates = byTypeAndRg.get(`${edge.to}|${(r.resourceGroup ?? "").toLowerCase()}`) ?? [];
      for (const c of candidates) if (c.key !== r.key && !deps.some((d) => d.targetKey === c.key)) deps.push({ targetKey: c.key, targetType: c.type, relationship: edge.relationship, origin: "inferred", note: `${edge.note} (inferred from type and shared resource group; confirm with authenticated discovery)` });
    }
    out.set(r.key, deps);
  }
  return out;
}

/** Topological-ish ordering: dependencies first, cycles broken by name. Returns sequence positions. */
export function sequence(resources: NormalizedResource[], deps: Map<string, Dependency[]>): Map<string, number> {
  const pos = new Map<string, number>();
  const visiting = new Set<string>();
  const keys = new Set(resources.map((r) => r.key));
  let counter = 0;
  const visit = (k: string): void => {
    if (pos.has(k) || visiting.has(k) || !keys.has(k)) return;
    visiting.add(k);
    for (const d of deps.get(k) ?? []) if (d.relationship !== "child") visit(d.targetKey);
    visiting.delete(k);
    pos.set(k, ++counter);
  };
  for (const r of [...resources].sort((a, b) => a.name.localeCompare(b.name))) visit(r.key);
  return pos;
}
