import type { Assessment } from "@amo/domain";

const SECRET_RX = /(AccountKey=|SharedAccessSignature=|sig=[A-Za-z0-9%+/=]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|client_secret\s*=\s*"[^"$]|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.)/;

/** Safety Agent (§12.18). Pure checks over the assessment and bundle. */
export function runSafetyChecks(a: Assessment, bundleFiles: Record<string, string>): string[] {
  const findings: string[] = [];
  for (const d of a.decisions) {
    if (!a.authenticated && d.confidence.band === "high") findings.push(`CRITICAL ${d.displayName}: high confidence without authenticated evidence`);
    if (d.recommendedTool === "azure-site-recovery" && d.desiredOperation !== "disaster-recovery") findings.push(`CRITICAL ${d.displayName}: Azure Site Recovery selected as a migration tool`);
    if (d.disposition === "unknown-requires-validation" && d.implementationStatus === "planned") findings.push(`CRITICAL ${d.displayName}: unknown disposition marked as planned`);
    if (d.disposition !== "native-move" && d.disposition !== "retain" && d.alternativeMethods.length === 0 && d.recommendedTool === "none") findings.push(`WARN ${d.displayName}: no tool and no alternative recorded`);
    if (!d.evidence.length) findings.push(`WARN ${d.displayName}: no evidence attached`);
  }
  if (a.edition === "demo" && !bundleFiles["DEMO-NOT-FOR-PRODUCTION.md"]) findings.push("CRITICAL demo bundle lacks DEMO-NOT-FOR-PRODUCTION.md");
  if (a.edition === "demo" && a.authenticated) findings.push("CRITICAL demo assessment claims authentication");
  for (const [p, c] of Object.entries(bundleFiles)) if (SECRET_RX.test(c)) findings.push(`CRITICAL ${p}: secret-like content detected in generated artifact`);
  for (const [p, c] of Object.entries(bundleFiles)) if (/production[- ]ready|production[- ]approved(?! until| :)/i.test(c) && !/not production|NOT PRODUCTION|not production-approved/i.test(c)) findings.push(`WARN ${p}: text may misrepresent generated output as production-ready`);
  return findings;
}

export const hasCritical = (findings: string[]): boolean => findings.some((f) => f.startsWith("CRITICAL"));
