import { DISPOSITIONS, type AssessmentSummary, type Edition, type ResourceDecisionRecord } from "@amo/domain";

export function summarize(decisions: ResourceDecisionRecord[], edition: Edition, authenticated: boolean): AssessmentSummary {
  const dispositionTotals = Object.fromEntries(DISPOSITIONS.map((d) => [d, 0])) as AssessmentSummary["dispositionTotals"];
  const confidenceTotals = { low: 0, medium: 0, high: 0 };
  for (const d of decisions) {
    dispositionTotals[d.disposition]++;
    confidenceTotals[d.confidence.band]++;
  }
  const unknownCount = dispositionTotals["unknown-requires-validation"];
  const nonNative = decisions.length - dispositionTotals["native-move"] - dispositionTotals.retain - dispositionTotals.retire;
  const ratio = decisions.length ? nonNative / decisions.length : 0;
  const complexityBand: AssessmentSummary["complexityBand"] = decisions.length > 150 || ratio > 0.6 ? "high" : decisions.length > 40 || ratio > 0.3 ? "medium" : "low";
  const blockerCounts = new Map<string, number>();
  for (const d of decisions) for (const b of d.blockers) blockerCounts.set(b, (blockerCounts.get(b) ?? 0) + 1);
  const keyBlockers = [...blockerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b, n]) => `${b} (${n})`);
  const disclaimers = [
    "Dispositions are rule-based recommendations, not an authoritative Microsoft assessment. Validate every conditional or unknown item with an authenticated inspection and the current Microsoft Learn move-support matrix.",
    "Generated Terraform, scripts and runbooks are illustrative and not production-approved until validated (fmt/validate/scan/plan/human approval).",
  ];
  if (edition === "demo" || !authenticated) disclaimers.unshift("Hybrid Cloud Works Migration Explorer: analysis of an exported inventory only. No Azure tenant was accessed.");
  return { resourceCount: decisions.length, dispositionTotals, unknownCount, confidenceTotals, complexityBand, keyBlockers, disclaimers };
}
