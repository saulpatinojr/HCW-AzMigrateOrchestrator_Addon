import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The lab API reports apps/lab-api/package.json's version in /api/health and x-addon-version; the edition's tag follows the
// root package.json. They drifted at v0.3.1 (the image reported 0.3.0), so every workspace version is pinned to the root's.
const version = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8")).version;

test("every workspace package.json and repository.manifest.json carries the edition version", () => {
  const root = version("package.json");
  assert.match(root, /^\d+\.\d+\.\d+$/);
  for (const p of ["apps/lab-api/package.json", "apps/lab-web/package.json", "repository.manifest.json"]) assert.equal(version(p), root, `${p} must be ${root}`);
});
