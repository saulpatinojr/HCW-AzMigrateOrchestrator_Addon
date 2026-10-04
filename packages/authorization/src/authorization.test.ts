import { test } from "node:test";
import assert from "node:assert/strict";
import { demoPrincipal, gate, isAllowed, type Principal } from "./index.js";

test("demo principal can plan but never execute, regardless of granted level", () => {
  const p = demoPrincipal("u1");
  assert.equal(isAllowed(p, "planning"), true);
  assert.equal(isAllowed({ ...p, grantedLevel: "destructive-execution" }, "controlled-execution"), false);
  assert.equal(gate(p, "dns-change", "x").allowed, false);
});

test("enterprise execution requires level and explicit approval", () => {
  const p: Principal = { id: "e", edition: "enterprise", grantedLevel: "controlled-execution", approvals: new Set() };
  assert.equal(gate(p, "dns-change", "zone1").allowed, false);
  p.approvals.add("dns-change:zone1");
  assert.equal(gate(p, "dns-change", "zone1").allowed, true);
  assert.equal(gate(p, "source-delete", "zone1").allowed, false);
});
