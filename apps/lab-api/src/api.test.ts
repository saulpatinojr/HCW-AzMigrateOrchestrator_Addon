import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultRulesDir } from "@amo/evidence-engine";
import { noopLogger } from "@amo/observability";
import { createDemoApi } from "./app.js";

const root = join(defaultRulesDir(), "..");
const sample = readFileSync(join(root, "samples", "resources-csv", "sample-resources.csv"), "utf8");
const { server } = createDemoApi({ logger: noopLogger, sampleCsvPath: join(root, "samples", "resources-csv", "sample-resources.csv"), staticDir: join(root, "apps", "lab-web", "public") });
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}`;
after(() => server.close());

test("create → read → file → zip → delete lifecycle with owner isolation", async () => {
  const created = await fetch(`${base}/api/assessments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv: sample, fileName: "resources.csv", intent: { destinationRegion: "westus3", sameTenant: true } }) });
  assert.equal(created.status, 201);
  const body = (await created.json()) as { assessmentId: string; ownerToken: string; summary: { resourceCount: number } };
  assert.ok(body.summary.resourceCount > 20);
  const noToken = await fetch(`${base}/api/assessments/${body.assessmentId}`);
  assert.equal(noToken.status, 404);
  const wrong = await fetch(`${base}/api/assessments/${body.assessmentId}`, { headers: { "x-owner-token": "nope" } });
  assert.equal(wrong.status, 404);
  const ok = await fetch(`${base}/api/assessments/${body.assessmentId}`, { headers: { "x-owner-token": body.ownerToken } });
  assert.equal(ok.status, 200);
  const file = await fetch(`${base}/api/assessments/${body.assessmentId}/files/DEMO-NOT-FOR-PRODUCTION.md`, { headers: { "x-owner-token": body.ownerToken } });
  assert.equal(file.status, 200);
  const zip = await fetch(`${base}/api/assessments/${body.assessmentId}/bundle.zip`, { headers: { "x-owner-token": body.ownerToken } });
  assert.equal(zip.headers.get("content-type"), "application/zip");
  assert.equal((await zip.arrayBuffer()).byteLength > 1000, true);
  const del = await fetch(`${base}/api/assessments/${body.assessmentId}`, { method: "DELETE", headers: { "x-owner-token": body.ownerToken } });
  assert.equal(del.status, 200);
  assert.equal((await fetch(`${base}/api/assessments/${body.assessmentId}`, { headers: { "x-owner-token": body.ownerToken } })).status, 404);
});

test("rejects credentials in questionnaire, bad CSV, and oversize bodies; no execution surface", async () => {
  const cred = await fetch(`${base}/api/assessments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv: sample, intent: { storageKey: "x" } }) });
  assert.equal(cred.status, 400);
  const bad = await fetch(`${base}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv" }, body: "NAME,LOCATION\na,b\n" });
  assert.equal(bad.status, 422);
  const big = await fetch(`${base}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv" }, body: "x".repeat(6 * 1024 * 1024) }).catch(() => null);
  assert.ok(big === null || big.status === 413);
  const exec = await fetch(`${base}/api/execute/anything`, { method: "POST" });
  assert.equal(exec.status, 403);
  const health = (await (await fetch(`${base}/api/health`)).json()) as { azureConnectivity: string };
  assert.equal(health.azureConnectivity, "disabled-by-design");
});

test("static UI is served with security headers and path traversal is blocked", async () => {
  const idx = await fetch(`${base}/`);
  assert.equal(idx.status, 200);
  assert.ok(idx.headers.get("content-security-policy")?.includes("default-src 'self'"));
  const trav = await fetch(`${base}/../../package.json`);
  assert.ok(!(await trav.text()).includes('"workspaces"'));
});

test("CORS: allowed origin gets headers, others do not; preflight 204/403", async () => {
  const { server: s2 } = createDemoApi({ logger: noopLogger, allowedOrigins: ["https://hybridcloudworks.com"] });
  await new Promise<void>((r) => s2.listen(0, r));
  const b2 = `http://127.0.0.1:${(s2.address() as { port: number }).port}`;
  try {
    const ok = await fetch(`${b2}/api/health`, { headers: { origin: "https://hybridcloudworks.com" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "https://hybridcloudworks.com");
    const no = await fetch(`${b2}/api/health`, { headers: { origin: "https://evil.example" } });
    assert.equal(no.headers.get("access-control-allow-origin"), null);
    assert.equal((await fetch(`${b2}/api/assessments`, { method: "OPTIONS", headers: { origin: "https://hybridcloudworks.com" } })).status, 204);
    assert.equal((await fetch(`${b2}/api/assessments`, { method: "OPTIONS", headers: { origin: "https://evil.example" } })).status, 403);
  } finally { s2.close(); }
});

test("Turnstile: enforced when a secret is configured, verified via siteverify", async () => {
  const seen: string[] = [];
  const fake = (async (url: string, init?: RequestInit) => { seen.push(String(init?.body)); return new Response(JSON.stringify({ success: String(init?.body).includes("response=good") }), { status: 200 }); }) as unknown as typeof fetch;
  const { server: s3 } = createDemoApi({ logger: noopLogger, turnstileSecret: "secret", fetchImpl: fake });
  await new Promise<void>((r) => s3.listen(0, r));
  const b3 = `http://127.0.0.1:${(s3.address() as { port: number }).port}`;
  try {
    const missing = await fetch(`${b3}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv" }, body: sample });
    assert.equal(missing.status, 403);
    const bad = await fetch(`${b3}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv", "x-turnstile-token": "bad" }, body: sample });
    assert.equal(bad.status, 403);
    const good = await fetch(`${b3}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv", "x-turnstile-token": "good" }, body: sample });
    assert.equal(good.status, 201);
    assert.ok(seen.some((b) => b.includes("secret=secret")));
  } finally { s3.close(); }
});

test("workspace: disabled provider hides the feature; in-memory provider issues a one-time bundle token", async () => {
  const { InMemoryWorkspaceProvider } = await import("@amo/workspace-provider");
  const { server: s4, store } = createDemoApi({ logger: noopLogger, workspaceProvider: new InMemoryWorkspaceProvider(), publicBaseUrl: "https://labs-api.example" });
  await new Promise<void>((r) => s4.listen(0, r));
  const b4 = `http://127.0.0.1:${(s4.address() as { port: number }).port}`;
  try {
    const created = (await (await fetch(`${b4}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv" }, body: sample })).json()) as { assessmentId: string; ownerToken: string };
    const ws = await fetch(`${b4}/api/assessments/${created.assessmentId}/workspace`, { method: "POST", headers: { "x-owner-token": created.ownerToken } });
    assert.equal(ws.status, 202);
    const body = (await ws.json()) as { launchUrl: string };
    assert.ok(body.launchUrl.startsWith("memory://"));
    // The one-time token is what the workspace uses; owner token is never shared with it.
    const token = store.issueBundleToken(created.assessmentId, created.ownerToken)!;
    const first = await fetch(`${b4}/api/assessments/${created.assessmentId}/bundle.zip`, { headers: { "x-bundle-token": token } });
    assert.equal(first.status, 200);
    const second = await fetch(`${b4}/api/assessments/${created.assessmentId}/bundle.zip`, { headers: { "x-bundle-token": token } });
    assert.equal(second.status, 404, "single use");
    assert.equal((await fetch(`${b4}/api/assessments/${created.assessmentId}`, { headers: { "x-bundle-token": token } })).status, 404, "bundle token never grants the assessment itself");
  } finally { s4.close(); }
  assert.equal((await fetch(`${base}/api/assessments/00000000-0000-4000-8000-000000000000/workspace`, { method: "POST" })).status, 404);
});

test("rules coverage is public; stats are opt-in and contain aggregates only", async () => {
  const cov = (await (await fetch(`${base}/api/rules/coverage`)).json()) as { count: number; types: Array<{ resourceType: string; support: object }> };
  assert.ok(cov.count >= 24 && cov.types[0].support);
  assert.equal((await fetch(`${base}/api/stats`)).status, 404);
  const { server: s5 } = createDemoApi({ logger: noopLogger, telemetry: true });
  await new Promise<void>((r) => s5.listen(0, r));
  const b5 = `http://127.0.0.1:${(s5.address() as { port: number }).port}`;
  try {
    await fetch(`${b5}/api/assessments`, { method: "POST", headers: { "content-type": "text/csv" }, body: sample });
    const st = (await (await fetch(`${b5}/api/stats`)).json()) as { assessments: number; topResourceTypes: Array<{ key: string }>; typesWithoutRule: Array<{ key: string }> };
    assert.equal(st.assessments, 1);
    assert.ok(st.topResourceTypes.length > 5);
    assert.ok(st.typesWithoutRule.some((t) => t.key === "microsoft.quantum/workspaces"));
    assert.ok(!JSON.stringify(st).includes("00000000-0000-4000-8000-000000000001"), "no subscription IDs in stats");
    assert.ok(!JSON.stringify(st).includes("vm-billing-01"), "no resource names in stats");
  } finally { s5.close(); }
});
