import { DISPOSITIONS, DIMENSION_DISPOSITIONS, MIGRATION_TOOLS, SUPPORT_STATES } from "./taxonomy.js";
import type { MigrationRule } from "./rule.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

function checkPattern(p: unknown, path: string, issues: ValidationIssue[]): void {
  if (!p || typeof p !== "object") {
    issues.push({ path, message: "pattern must be an object" });
    return;
  }
  const o = p as Record<string, unknown>;
  if (!DISPOSITIONS.includes(o.disposition as never)) issues.push({ path: `${path}.disposition`, message: `invalid disposition ${String(o.disposition)}` });
  if (!MIGRATION_TOOLS.includes(o.tool as never)) issues.push({ path: `${path}.tool`, message: `invalid tool ${String(o.tool)}` });
  for (const dim of ["infrastructure", "configuration", "identity", "data"]) {
    if (!DIMENSION_DISPOSITIONS.includes(o[dim] as never)) issues.push({ path: `${path}.${dim}`, message: `invalid dimension disposition ${String(o[dim])}` });
  }
  if (!["none", "minutes", "hours", "unknown"].includes(o.expectedDowntime as string)) issues.push({ path: `${path}.expectedDowntime`, message: "invalid expectedDowntime" });
}

/** Structural validation of a rule object; a lightweight, dependency-free counterpart to rules/schemas/rule.schema.json. */
export function validateRule(rule: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!rule || typeof rule !== "object") return [{ path: "", message: "rule must be an object" }];
  const r = rule as Record<string, unknown>;
  for (const f of ["ruleId", "ruleVersion", "provider", "resourceType", "reviewDate"]) if (!isStr(r[f])) issues.push({ path: f, message: "required string" });
  if (isStr(r.ruleId) && !/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(r.ruleId)) issues.push({ path: "ruleId", message: "ruleId must be dotted lowercase, e.g. azure.compute.virtualmachines" });
  if (isStr(r.resourceType) && isStr(r.provider) && !r.resourceType.toLowerCase().startsWith(r.provider.toLowerCase() + "/")) issues.push({ path: "resourceType", message: "resourceType must start with provider" });
  if (!isArr(r.sourceScope) || r.sourceScope.length === 0) issues.push({ path: "sourceScope", message: "non-empty array" });
  if (!isArr(r.destinationScope) || r.destinationScope.length === 0) issues.push({ path: "destinationScope", message: "non-empty array" });
  if (!["same-tenant", "cross-tenant", "any"].includes(r.tenantApplicability as string)) issues.push({ path: "tenantApplicability", message: "invalid" });
  const s = r.support as Record<string, unknown> | undefined;
  if (!s) issues.push({ path: "support", message: "required" });
  else for (const k of ["resourceGroupMove", "subscriptionMove", "regionRelocation", "crossTenant"]) if (!SUPPORT_STATES.includes(s[k] as never)) issues.push({ path: `support.${k}`, message: `invalid support state ${String(s[k])}` });
  checkPattern(r.recommendedPattern, "recommendedPattern", issues);
  if (r.crossTenantPattern) checkPattern(r.crossTenantPattern, "crossTenantPattern", issues);
  if (r.regionRelocationPattern) checkPattern(r.regionRelocationPattern, "regionRelocationPattern", issues);
  if (!isArr(r.alternatives)) issues.push({ path: "alternatives", message: "array required" });
  else for (const [i, a] of r.alternatives.entries()) if (!MIGRATION_TOOLS.includes(a as never)) issues.push({ path: `alternatives[${i}]`, message: `invalid tool ${String(a)}` });
  if (!isArr(r.documentationSources) || r.documentationSources.length === 0) issues.push({ path: "documentationSources", message: "at least one source with title/url/retrievedOn" });
  else for (const [i, d] of r.documentationSources.entries()) {
    const o = d as Record<string, unknown>;
    if (!isStr(o.title) || !isStr(o.url) || !isStr(o.retrievedOn)) issues.push({ path: `documentationSources[${i}]`, message: "title, url, retrievedOn required" });
    else if (!/^https:\/\/(learn\.microsoft\.com|azure\.microsoft\.com|github\.com\/Azure|github\.com\/MicrosoftDocs)\//.test(o.url)) issues.push({ path: `documentationSources[${i}].url`, message: "sources must be Microsoft Learn/Azure/MicrosoftDocs (organizational overlays may extend this)" });
  }
  if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 1) issues.push({ path: "confidence", message: "number 0..1" });
  if (!isArr(r.requiredEvidence)) issues.push({ path: "requiredEvidence", message: "array required" });
  if (typeof r.humanReviewRequired !== "boolean") issues.push({ path: "humanReviewRequired", message: "boolean required" });
  // Principle: unsupported with no alternatives is never a final answer.
  const unsupportedEverywhere = s && Object.values(s).every((v) => v === "unsupported");
  if (unsupportedEverywhere && isArr(r.alternatives) && r.alternatives.length === 0) issues.push({ path: "alternatives", message: "an unsupported rule must offer at least one practical alternative" });
  // Principle: ASR is never a default migration tool.
  const rp = r.recommendedPattern as MigrationRule["recommendedPattern"] | undefined;
  if (rp && rp.tool === "azure-site-recovery" && !r.notes) issues.push({ path: "recommendedPattern.tool", message: "azure-site-recovery as default tool requires an explicit DR justification in notes" });
  return issues;
}
