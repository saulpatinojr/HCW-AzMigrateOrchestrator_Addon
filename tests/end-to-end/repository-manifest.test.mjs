import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("repository.manifest.json lists real, required files and packaging excludes are present", () => {
  const m = JSON.parse(readFileSync("repository.manifest.json", "utf8"));
  for (const f of m.requiredFiles) assert.ok(existsSync(f), `required file missing: ${f}`);
  for (const e of ["node_modules", ".git", "dist", ".local", ".env"]) assert.ok(m.packageExcludes.some((x) => x.includes(e)), `exclude missing: ${e}`);
  const sh = readFileSync("scripts/package-repository.sh", "utf8");
  for (const e of m.packageExcludes) assert.ok(sh.includes(e.replace(/\/$/, "")), `package-repository.sh does not exclude ${e}`);
});
