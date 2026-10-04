import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Assessment } from "@amo/domain";
import { decisionsCsv, engineeringAssessment, executiveSummary, risksReport, unknownsReport } from "@amo/report-engine";
import { generateTerraform, generateStateImpact, generateHcpFiles, buildArgumentManifest } from "@amo/terraform-generator";
import { generateRunbooks, generateScripts } from "@amo/runbook-generator";
import { buildValidationPlan } from "@amo/validation-engine";

export interface ArtifactManifest {
  edition: Assessment["edition"];
  generatedAt: string;
  assessmentId: string;
  inputHash: string;
  rulesVersion: string;
  rulesChecksum: string;
  applicationVersion: string;
  authenticated: boolean;
  confidenceSummary: Assessment["summary"]["confidenceTotals"];
  validationStatus: "not-validated";
  productionStatus: "non-production" | "pending-validation";
  files: Array<{ path: string; sha256: string; bytes: number; kind: string }>;
}

export interface Bundle {
  files: Record<string, string>;
  manifest: ArtifactManifest;
}

const kindOf = (p: string): string => (p.startsWith("terraform/") ? "terraform" : p.startsWith("scripts/powershell") ? "powershell" : p.startsWith("scripts/azure-cli") ? "azure-cli" : p.startsWith("runbooks/") ? "runbook" : p.startsWith("validation/") ? "validation" : p.startsWith("evidence/") ? "evidence" : "report");

/** Assemble the assessment-output bundle (§19, §20). Pure: returns file map; callers persist or zip. */
export function buildBundle(a: Assessment): Bundle {
  const files: Record<string, string> = {};
  files["reports/executive-summary.md"] = executiveSummary(a);
  files["reports/engineering-assessment.md"] = engineeringAssessment(a);
  files["reports/resource-decisions.csv"] = decisionsCsv(a.decisions);
  files["reports/resource-decisions.json"] = JSON.stringify({ assessmentId: a.id, edition: a.edition, generatedAt: a.createdAt, rulesVersion: a.rulesVersion, decisions: a.decisions }, null, 2) + "\n";
  files["reports/risks.md"] = risksReport(a);
  files["reports/unknowns-and-required-validation.md"] = unknownsReport(a);
  const tf = generateTerraform(a);
  for (const [p, c] of Object.entries(tf.files)) files[`terraform/${p}`] = c;
  for (const [p, c] of Object.entries(generateStateImpact(a))) files[`terraform/${p}`] = c;
  for (const [p, c] of Object.entries(generateHcpFiles(a))) files[`terraform/${p}`] = c;
  files["terraform/argument-manifest.json"] = JSON.stringify(buildArgumentManifest(tf.files), null, 2) + "\n";
  for (const [p, c] of Object.entries(generateScripts(a))) files[`scripts/${p}`] = c;
  for (const [p, c] of Object.entries(generateRunbooks(a))) files[`runbooks/${p}`] = c;
  const v = buildValidationPlan(a.decisions);
  files["validation/checklist.md"] = v.checklist;
  files["validation/reconciliation-plan.md"] = v.reconciliationPlan;
  files["validation/test-plan.md"] = v.testPlan;
  const rulesUsed = [...new Set(a.decisions.map((d) => d.ruleId).filter(Boolean))].sort();
  files["evidence/rules-used.json"] = JSON.stringify({ rulesVersion: a.rulesVersion, rulesChecksum: a.rulesChecksum, ruleIds: rulesUsed }, null, 2) + "\n";
  files["evidence/assumptions.json"] = JSON.stringify({ questionnaireAssumedFields: a.intent.assumedFields, perResource: a.decisions.map((d) => ({ resource: d.displayName, assumptions: d.assumptions })) }, null, 2) + "\n";
  files["evidence/provenance.json"] = JSON.stringify({ inputHash: a.inputHash, applicationVersion: a.applicationVersion, generatedAt: a.createdAt, edition: a.edition, authenticated: a.authenticated, evidenceStates: a.decisions.map((d) => ({ resource: d.displayName, states: [...new Set(d.evidence.map((e) => e.state))] })) }, null, 2) + "\n";
  if (a.edition === "demo" || !a.authenticated) {
    files["DEMO-NOT-FOR-PRODUCTION.md"] = `# DEMO — NOT FOR PRODUCTION\n\nThis bundle was produced by the Hybrid Cloud Works Migration Explorer from an exported resource inventory (CSV). No Azure tenant was accessed.\n\n- Dispositions are rule-based illustrations, not an authoritative Azure assessment.\n- Tenant, subscription, network and identity values are placeholders.\n- Scripts are dry-run by default and execution is disabled.\n- Generated Terraform has not been validated, scanned or planned.\n- Confidence is capped because inventory-only evidence cannot establish configuration-dependent facts.\n\nRun the enterprise edition with authenticated discovery for an assessment you can act on.\n`;
  } else {
    files["VALIDATION-STATUS.md"] = `# Validation status\n\nAuthenticated assessment. Generated artifacts remain **not validated** until fmt/validate/scan/plan review and human approval are recorded here.\n`;
  }
  const manifestFiles = Object.entries(files).map(([p, c]) => ({ path: p, sha256: createHash("sha256").update(c).digest("hex"), bytes: Buffer.byteLength(c, "utf8"), kind: kindOf(p) }));
  const manifest: ArtifactManifest = {
    edition: a.edition,
    generatedAt: a.createdAt,
    assessmentId: a.id,
    inputHash: a.inputHash,
    rulesVersion: a.rulesVersion,
    rulesChecksum: a.rulesChecksum,
    applicationVersion: a.applicationVersion,
    authenticated: a.authenticated,
    confidenceSummary: a.summary.confidenceTotals,
    validationStatus: "not-validated",
    productionStatus: a.edition === "demo" ? "non-production" : "pending-validation",
    files: manifestFiles,
  };
  files["manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
  files["README.md"] = `# Assessment output ${a.id}\n\n${a.edition === "demo" ? "**DEMO — NOT FOR PRODUCTION.** See DEMO-NOT-FOR-PRODUCTION.md.\n\n" : ""}Generated ${a.createdAt} · input ${a.inputHash.slice(0, 12)} · rules ${a.rulesVersion} · app ${a.applicationVersion}\n\n- reports/ — executive summary, engineering assessment, decisions (CSV/JSON), risks, unknowns\n- terraform/ — illustrative recreate scaffolding (${tf.modulesUsed.length} modules), state-impact/ (removed/import blocks: ARM moves change resource IDs), hcp/ (HCP Terraform workspace), argument-manifest.json\n- scripts/ — dry-run PowerShell and Azure CLI scaffolding\n- runbooks/ — pre-migration, migration, cutover, validation, rollback\n- validation/ — checklist, reconciliation plan, test plan\n- evidence/ — rules used, assumptions, provenance\n- manifest.json — hashes of every file\n`;
  return { files, manifest };
}

export function writeBundle(bundle: Bundle, outDir: string): string[] {
  const written: string[] = [];
  for (const [p, c] of Object.entries(bundle.files)) {
    if (p.includes("..")) throw new Error(`unsafe path ${p}`);
    const full = join(outDir, p);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, c);
    written.push(full);
  }
  return written;
}
