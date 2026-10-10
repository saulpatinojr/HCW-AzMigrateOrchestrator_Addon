import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Two-way contract: every `/api/...` route the lab API handles is documented in docs/api/openapi.yaml, and every documented
 * path is handled. Routes are read from app.ts itself: `url.pathname === "/api/x"` literals, `startsWith("/api/x")` prefixes
 * and the alternation inside the `/api/assessments/{id}` regex.
 */
const spec = readFileSync("docs/api/openapi.yaml", "utf8");
const src = readFileSync("apps/lab-api/src/app.ts", "utf8");

const specPaths = new Set([...spec.matchAll(/^  (\/api\/[^:\s]+):/gm)].map((m) => m[1]));

function routesFromSource(text) {
  const routes = new Set();
  for (const m of text.matchAll(/url\.pathname === "(\/api\/[^"]+)"/g)) routes.add(m[1]);
  for (const m of text.matchAll(/url\.pathname\.startsWith\("(\/api\/[^"/]+)"\)/g)) routes.add(m[1]);
  // The id-scoped routes: one regex whose optional group lists the sub-resources.
  const rx = text.match(/\^\\\/api\\\/assessments\\\/\(\[0-9a-f-\]\{36\}\)\((.*?)\)\?\$/);
  assert.ok(rx, "the /api/assessments/{id} regex is where the contract test expects it");
  routes.add("/api/assessments/{id}");
  for (const alt of rx[1].split("|")) routes.add("/api/assessments/{id}" + alt.replace(/\\\//g, "/").replace(/\\\./g, ".").replace(/\(\.\+\)/g, "{path}"));
  return routes;
}

test("every path in docs/api/openapi.yaml is handled by the lab API source", () => {
  const handled = routesFromSource(src);
  assert.ok(specPaths.size >= 10, `spec lists ${specPaths.size} paths`);
  for (const p of specPaths) assert.ok(handled.has(p), `documented route ${p} is not handled by app.ts (handled: ${[...handled].sort().join(", ")})`);
});

test("every route the lab API handles is documented in docs/api/openapi.yaml", () => {
  for (const r of routesFromSource(src)) assert.ok(specPaths.has(r), `handled route ${r} is missing from openapi.yaml`);
});

test("the spec documents the AddOn contract: health envelope, x-addon headers, 429 and 503 answers", () => {
  for (const must of ["x-addon-id", "x-addon-version", "AddOnHealth", "siteOrigins", "turnstile", '"429"', '"503"', "rate_limited", "overloaded", "turnstile_not_configured", "Retry-After"]) assert.ok(spec.includes(must), `openapi.yaml lacks ${must}`);
  const version = JSON.parse(readFileSync("apps/lab-api/package.json", "utf8")).version;
  assert.ok(spec.includes(`version: ${version}`), `openapi.yaml info.version should be ${version}`);
});
