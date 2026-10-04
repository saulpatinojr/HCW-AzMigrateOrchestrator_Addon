import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryWorkspaceProvider, DisabledWorkspaceProvider, CoderWorkspaceProvider, workspaceProviderFromEnv } from "./index.js";

test("in-memory provider lifecycle", async () => {
  const p = new InMemoryWorkspaceProvider();
  const w = await p.createWorkspace({ assessmentId: "abcdefgh-1", ownerId: "u", artifacts: { "README.md": "x" }, ttlMinutes: 60 });
  assert.equal((await p.getWorkspaceStatus(w.id)).status, "running");
  await p.stopWorkspace(w.id);
  assert.equal((await p.getWorkspaceStatus(w.id)).status, "stopped");
  await p.deleteWorkspace(w.id);
  assert.equal((await p.getWorkspaceStatus(w.id)).status, "deleted");
});

test("disabled provider fails loudly instead of faking", async () => {
  await assert.rejects(new DisabledWorkspaceProvider().createWorkspace({ assessmentId: "a", ownerId: "u", artifacts: {}, ttlMinutes: 1 }));
  assert.equal(workspaceProviderFromEnv({}).name, "disabled");
});

test("coder provider sends session token and template id", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ id: "w1", latest_build: { status: "running" } }), { status: 200 }); }) as unknown as typeof fetch;
  const p = new CoderWorkspaceProvider("https://coder.example", "tok", "tpl", fakeFetch);
  await p.createWorkspace({ assessmentId: "abcdefgh-2", ownerId: "u", artifacts: {}, ttlMinutes: 30 });
  assert.ok(calls[0].url.endsWith("/api/v2/users/me/workspaces"));
  assert.equal((calls[0].init?.headers as Record<string, string>)["Coder-Session-Token"], "tok");
  assert.ok(String(calls[0].init?.body).includes('"template_id":"tpl"'));
});
