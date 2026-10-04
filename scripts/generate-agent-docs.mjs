#!/usr/bin/env node
/** Render docs/agents/README.md from the agent definitions so documentation cannot drift from code. */
import { writeFileSync } from "node:fs";
import { AGENTS } from "@amo/agents";
const out = ["# Agents", "", "Generated from `packages/agents/src/definitions.ts` by `scripts/generate-agent-docs.mjs`. Do not edit by hand.", "", `${AGENTS.length} agents. Agents marked *enterprise only* are defined but do not run in the demo edition.`, ""];
for (const a of AGENTS) {
  out.push(`## ${a.name} (\`${a.id}\`)${a.demo ? "" : " — enterprise only"}`, "", a.purpose, "", "| | |", "|---|---|",
    `| Inputs | ${a.inputs.join("; ")} |`, `| Outputs | ${a.outputs.join("; ")} |`, `| Allowed tools | ${a.allowedTools.join("; ")} |`, `| Prohibited | ${a.prohibitedActions.join("; ")} |`,
    `| State | ${a.state} |`, `| Handoff | ${a.handoffCondition} |`, `| Retry | ${a.retryPolicy} |`, `| On failure | ${a.failureBehavior} |`, `| Human approval boundary | ${a.humanApprovalBoundary} |`,
    `| Audit events | ${a.auditEvents.join(", ")} |`, `| Deterministic fallback | ${a.deterministicFallback} |`, "");
}
out.push("## Execution order (orchestrator)", "", "csv-discovery *or* discovery → intake → evidence → dependencies → landing-zone → classification → waves → report (iac, tooling, data, dr, validation, security run inside the bundle build) → safety. The approval gate is consulted only by execution surfaces, which the demo does not have.", "");
writeFileSync("docs/agents/README.md", out.join("\n"));
console.log("docs/agents/README.md written");
