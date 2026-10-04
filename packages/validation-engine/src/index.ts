import type { ResourceDecisionRecord } from "@amo/domain";

export interface ValidationPlan {
  checklist: string;
  reconciliationPlan: string;
  testPlan: string;
}

const DATA_DIMS = new Set(["replicate", "backup-restore", "export-import", "sync-and-cutover"]);

/** Validation Agent output (§12.15, §23). */
export function buildValidationPlan(decisions: ResourceDecisionRecord[]): ValidationPlan {
  const lines: string[] = ["# Validation checklist", "", "Tick each item with evidence (screenshot, CLI output, query result) attached to the migration record.", ""];
  const dims = ["Infrastructure", "Configuration", "Identity", "Network", "Security", "Data", "Performance", "Monitoring", "Backup", "DR", "Application function"];
  lines.push("## Cross-cutting", ...dims.map((d) => `- [ ] ${d}: destination state reviewed against source baseline and signed off`), "");
  for (const d of decisions) {
    lines.push(`## ${d.displayName} (${d.resourceType})`, `- Disposition: ${d.disposition}; tool: ${d.recommendedTool}; confidence: ${d.confidence.band}`);
    const items = d.validationMethod.length ? d.validationMethod : ["Resource exists in destination with matching SKU/kind/tags", "Diagnostic settings and alerts attached", "Dependent resources resolve to destination"];
    for (const v of items) lines.push(`- [ ] ${v}`);
    if (d.identityDisposition === "reconstruct") lines.push("- [ ] Every role assignment, Key Vault policy and federated credential re-bound to the new identity");
    if (DATA_DIMS.has(d.dataDisposition)) lines.push("- [ ] Data reconciliation passed (see reconciliation plan)");
    if (d.disposition === "unknown-requires-validation") lines.push("- [ ] Authenticated inspection completed and disposition assigned");
    lines.push("");
  }

  const dataDecisions = decisions.filter((d) => DATA_DIMS.has(d.dataDisposition));
  const recon: string[] = ["# Data reconciliation plan", "", "Data is validated independently from infrastructure (§23). Each data-bearing resource gets its own plan.", ""];
  if (!dataDecisions.length) recon.push("_No data-bearing resources in this assessment require a separate data path._");
  for (const d of dataDecisions) {
    recon.push(`## ${d.displayName} — ${d.dataDisposition} via ${d.recommendedTool}`, "", "| Field | Value |", "|---|---|", `| Source | ${d.resourceId ?? d.displayName} |`, `| Destination | ${d.destinationScope ?? "TBD"} |`, `| Method | ${d.recommendedTool} (alternatives: ${d.alternativeMethods.join(", ") || "none"}) |`, "| Mode | online: initial copy → delta passes → freeze → final sync → cutover; offline: freeze → copy → cutover |", `| Expected downtime | ${d.expectedDowntime} |`, `| RTO / RPO compatibility | ${d.rtoCompatibility} / ${d.rpoCompatibility} |`, "| Encryption in transit | TLS 1.2+; private endpoints where policy requires |", "| Validation | counts (objects/rows/files), total bytes, checksums where supported, schema comparison for databases, replication lag = 0 at cutover |", "| Tolerance | 0 missing objects; byte totals equal; document tolerance for eventually-consistent stores |", "| Rollback | source remains authoritative until sign-off; revert connection strings/DNS |", "| Retention | source retained ≥ one backup cycle after cutover |", "| Evidence | copy job logs, reconciliation query output, sign-off record |", "");
  }

  const tests: string[] = ["# Test plan", "", "## Pre-migration", "- Capture baseline: inventory export, effective RBAC, network effective routes/NSG rules, app health probes, performance baseline.", "- Dry-run every generated script with -WhatIf / --dry-run.", "", "## Test migration (non-production or isolated)", "- Execute waves 1–2 into an isolated destination; validate connectivity and data copy before production cutover.", "", "## Cutover", "- Freeze; final sync; reconciliation; switch DNS/connection strings; smoke tests; monitor error rates for the hypercare window.", "", "## Post-migration", "- Re-enable backup/DR; verify alerts; compare performance to baseline; schedule source decommission only after the agreed retention period.", ""];
  return { checklist: lines.join("\n"), reconciliationPlan: recon.join("\n"), testPlan: tests.join("\n") };
}
