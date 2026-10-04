import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultRulesDir } from "@amo/evidence-engine";
import { AzureResourceGraphDiscoveryProvider } from "@amo/azure-discovery";
import { Orchestrator, IngestionError, AGENTS, runSafetyChecks } from "./index.js";
import { join } from "node:path";

const sample = readFileSync(join(defaultRulesDir(), "..", "samples", "resources-csv", "sample-resources.csv"), "utf8");

test("end-to-end demo assessment of the sample CSV", async () => {
  const o = new Orchestrator({ edition: "demo", now: () => new Date("2026-10-03T12:00:00Z") });
  const { assessment, bundle } = await o.assessCsv(sample, { destinationRegion: "westus3", sameTenant: true, sameSubscription: true });
  assert.equal(assessment.edition, "demo");
  assert.equal(assessment.authenticated, false);
  assert.ok(assessment.decisions.length >= 20);
  assert.ok(bundle.files["DEMO-NOT-FOR-PRODUCTION.md"]);
  assert.ok(bundle.files["manifest.json"]);
  assert.ok(bundle.files["terraform/main.tf"]);
  assert.ok(bundle.files["runbooks/rollback.md"]);
  assert.ok(assessment.decisions.every((d) => d.confidence.band !== "high"));
  assert.ok(assessment.progress.some((p) => p.agent === "safety" && p.status === "completed"));
  assert.equal(assessment.safetyFindings.filter((f) => f.startsWith("CRITICAL")).length, 0);
  for (const f of Object.values(bundle.files)) assert.ok(!/AccountKey=|BEGIN PRIVATE KEY/.test(f));
});

test("ingestion errors surface as IngestionError", async () => {
  const o = new Orchestrator({ edition: "demo" });
  await assert.rejects(o.assessCsv("NAME,LOCATION\nx,y\n"), IngestionError);
});

test("demo orchestrator refuses an authenticated discovery provider", async () => {
  const o = new Orchestrator({ edition: "demo" });
  const p = new AzureResourceGraphDiscoveryProvider({ tenantId: "t", credentialKind: "azure-cli" });
  await assert.rejects(o.assessDiscovered(p, { kind: "subscription", id: "x" }), /must never use an authenticated/);
});

test("agent registry covers all 19 required agents and marks enterprise-only ones", () => {
  assert.equal(AGENTS.length, 19);
  assert.equal(AGENTS.filter((a) => !a.demo).map((a) => a.id).join(","), "discovery,cost");
  for (const a of AGENTS) assert.ok(a.prohibitedActions.length > 0 && a.humanApprovalBoundary);
});

test("safety agent catches misrepresentation and secrets", async () => {
  const o = new Orchestrator({ edition: "demo" });
  const { assessment } = await o.assessCsv(sample, { destinationRegion: "westus3" });
  const findings = runSafetyChecks(assessment, { "x.md": "AccountKey=abc", "y.md": "This Terraform is production-ready." });
  assert.ok(findings.some((f) => f.includes("secret-like")));
  assert.ok(findings.some((f) => f.includes("production-ready")));
});
