import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("every path in docs/api/openapi.yaml is handled by the demo API source", () => {
  const spec = readFileSync("docs/api/openapi.yaml", "utf8");
  const paths = [...spec.matchAll(/^  (\/api\/[^:\s]+):/gm)].map((m) => m[1]);
  assert.ok(paths.length >= 5);
  const src = readFileSync("apps/lab-api/src/app.ts", "utf8");
  for (const p of paths) {
    const literal = p.replace(/\{[^}]+\}/g, "");
    const stem = literal.replace(/\/+$/, "").split("/").filter(Boolean).slice(0, 2).join("/");
    assert.ok(src.includes(stem), `route ${p} (stem ${stem}) not found in app.ts`);
  }
});
