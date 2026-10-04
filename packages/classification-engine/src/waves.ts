import type { ResourceDecisionRecord, WavePlan } from "@amo/domain";

const FOUNDATION = /^(microsoft\.network\/(virtualnetworks|networksecuritygroups|routetables|natgateways|privatednszones|publicipaddresses|natgateways)|microsoft\.managedidentity|microsoft\.keyvault|microsoft\.operationalinsights|microsoft\.resources|microsoft\.insights\/actiongroups)/i;
const DATA = /^(microsoft\.storage|microsoft\.sql|microsoft\.dbfor|microsoft\.documentdb|microsoft\.cache|microsoft\.containerregistry)/i;
const EDGE = /^(microsoft\.network\/(loadbalancers|applicationgateways|azurefirewalls|privateendpoints)|microsoft\.web\/serverfarms)/i;
const OBS = /^(microsoft\.insights|microsoft\.recoveryservices|microsoft\.dataprotection|microsoft\.alertsmanagement|microsoft\.portal)/i;

/** Preliminary wave grouping (§12.14). Dependency-first by category, then application group, then sequence. */
export function planWaves(decisions: ResourceDecisionRecord[]): WavePlan {
  const waves: WavePlan["waves"] = [
    { number: 1, name: "Foundation: network, identity, secrets, logging", resourceKeys: [], entryCriteria: ["Destination landing zone scope approved", "Address space and naming approved"], exitCriteria: ["VNets/subnets/NSGs reachable", "Key Vaults and identities exist", "Log Analytics receiving data"], rationale: "Everything else binds to these." },
    { number: 2, name: "Data platforms: storage, databases, registries", resourceKeys: [], entryCriteria: ["Wave 1 complete", "Private connectivity in place", "Data copy tooling authorised"], exitCriteria: ["Initial copy complete", "Reconciliation plan agreed"], rationale: "Long-running copies start early; applications cut over last." },
    { number: 3, name: "Edge and platform: load balancers, gateways, private endpoints, plans", resourceKeys: [], entryCriteria: ["Wave 2 initial copy complete"], exitCriteria: ["Frontends healthy against staging backends"], rationale: "Connectivity for compute and apps." },
    { number: 4, name: "Compute and applications", resourceKeys: [], entryCriteria: ["Waves 1–3 complete", "Change freeze scheduled"], exitCriteria: ["Smoke tests pass", "Final data sync reconciled", "DNS cutover"], rationale: "Cutover wave." },
    { number: 5, name: "Observability, backup and DR re-protection", resourceKeys: [], entryCriteria: ["Wave 4 cutover accepted"], exitCriteria: ["Alerts firing on destination", "Backup/DR protection re-enabled"], rationale: "Protection follows the migrated workload." },
    { number: 6, name: "Requires validation / manual review", resourceKeys: [], entryCriteria: ["Authenticated inspection completed"], exitCriteria: ["Each item assigned to a wave or retired"], rationale: "Unknowns are not scheduled until evidence exists." },
  ];
  const sorted = [...decisions].sort((a, b) => (a.sequencePosition ?? 0) - (b.sequencePosition ?? 0) || a.displayName.localeCompare(b.displayName));
  for (const d of sorted) {
    const t = d.resourceType;
    let n: number;
    if (d.disposition === "unknown-requires-validation") n = 6;
    else if (d.disposition === "retain" || d.disposition === "retire") n = 5;
    else if (FOUNDATION.test(t)) n = 1;
    else if (DATA.test(t)) n = 2;
    else if (EDGE.test(t)) n = 3;
    else if (OBS.test(t)) n = 5;
    else n = 4;
    waves[n - 1].resourceKeys.push(d.resourceKey);
  }
  const groups = new Set(decisions.map((d) => d.applicationGroup).filter(Boolean));
  const notes = [
    "Preliminary grouping derived from resource type and inferred dependencies; refine with discovered dependencies and application ownership.",
    groups.size ? `Application groups observed from tags: ${[...groups].join(", ")}` : "No application-group tag values found; waves are type-based only.",
  ];
  return { waves: waves.filter((w) => w.resourceKeys.length > 0 || w.number <= 5), notes };
}
