import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MigrationExplorer, PoweredBy, PARTNERS, previewCsv, LabApiClient, SummaryPanel, DecisionTable } from "./index.js";
import type { AssessmentSummary, ResourceDecisionRecord } from "@amo/domain";

test("MigrationExplorer renders the disclaimer and upload step without touching window at module load", () => {
  const html = renderToStaticMarkup(<MigrationExplorer apiBaseUrl="https://labs-api.example" />);
  assert.ok(html.includes("never connects to an Azure tenant"));
  assert.ok(html.includes("https://labs-api.example/api/sample.csv"));
  assert.ok(html.includes("Powered by"));
  assert.ok(!html.includes("Run assessment"), "questionnaire hidden until a file is chosen");
});

test("PoweredBy lists every partner with an honest role statement", () => {
  const html = renderToStaticMarkup(<PoweredBy />);
  for (const p of PARTNERS) { assert.ok(html.includes(p.name)); assert.ok(html.includes(p.role.slice(0, 20))); }
  assert.ok(PARTNERS.some((p) => p.name === "Hostinger"));
});

test("previewCsv warns on missing columns and sniffs delimiter", () => {
  const p = previewCsv("NAME;LOCATION\nx;y\n");
  assert.equal(p.headers.length, 2);
  assert.ok(p.warnings.some((w) => w.includes("TYPE")));
  assert.equal(previewCsv("NAME,TYPE,RESOURCE ID\na,b,c").warnings.length, 0);
});

test("LabApiClient keeps the owner token in memory and sends it on later calls", async () => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const fake = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
    if (url.endsWith("/api/assessments")) return new Response(JSON.stringify({ assessmentId: "11111111-2222-4333-8444-555555555555", ownerToken: "tok", expiresAt: null, summary: {}, progress: [], ingestionWarnings: [] }), { status: 201 });
    return new Response(JSON.stringify({ assessment: {}, files: [] }), { status: 200 });
  }) as unknown as typeof fetch;
  const c = new LabApiClient({ baseUrl: "https://x/", fetchImpl: fake });
  await c.create({ csv: "NAME,TYPE\na,b" }, "turnstile-token");
  await c.get();
  assert.equal(calls[0].headers["x-turnstile-token"], "turnstile-token");
  assert.equal(calls[1].headers["x-owner-token"], "tok");
  assert.ok(calls[1].url.startsWith("https://x/api/assessments/1111"));
});

test("SummaryPanel and DecisionTable render data", () => {
  const summary: AssessmentSummary = { resourceCount: 2, dispositionTotals: { "native-move": 1, "orchestrated-migration": 0, "recreate-and-migrate": 1, "recreate-only": 0, retain: 0, retire: 0, replace: 0, redesign: 0, "unknown-requires-validation": 0 }, unknownCount: 0, confidenceTotals: { low: 0, medium: 2, high: 0 }, complexityBand: "low", keyBlockers: ["x (1)"], disclaimers: ["Demo"] };
  const html = renderToStaticMarkup(<SummaryPanel summary={summary} expiresAt={null} onDownload={() => {}} onDelete={() => {}} />);
  assert.ok(html.includes("recreate-and-migrate") && html.includes("Key blockers"));
  const d = { resourceKey: "k", displayName: "vm1", resourceType: "Microsoft.Compute/virtualMachines", disposition: "native-move", infrastructureDisposition: "move-with-resource", dataDisposition: "move-with-resource", recommendedTool: "arm-move", confidence: { band: "medium", score: 0.7, rationale: [] } } as unknown as ResourceDecisionRecord;
  assert.ok(renderToStaticMarkup(<DecisionTable decisions={[d]} onSelect={() => {}} />).includes("vm1"));
});
