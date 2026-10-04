import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, createLogger } from "./index.js";

test("redact masks connection strings, SAS tokens and JWTs", () => {
  const s = "DefaultEndpointsProtocol=https;AccountKey=abc123SECRET==;sig=abcdefghijklmnopqrstuvwxyz0123 token=eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstu";
  const r = redact(s);
  assert.ok(!r.includes("abc123SECRET"));
  assert.ok(!r.includes("abcdefghijklmnopqrstuvwxyz0123"));
  assert.ok(!r.includes("eyJhbGciOiJIUzI1NiIs"));
});

test("logger never emits nested objects (no raw rows)", () => {
  const out: unknown[] = [];
  const log = createLogger({}, (r) => out.push(r));
  log.info("x", { row: { a: 1 }, id: "abc" });
  assert.equal((out[0] as { attrs: Record<string, unknown> }).attrs.row, "[object]");
});
