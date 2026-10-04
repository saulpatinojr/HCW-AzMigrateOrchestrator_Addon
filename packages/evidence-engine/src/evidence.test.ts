import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRules, findRule, compareSnapshots, defaultRulesDir } from "./index.js";

test("repository rule corpus loads cleanly: no issues, duplicates, conflicts", () => {
  const loaded = loadRules(defaultRulesDir(), new Date("2026-10-03"));
  assert.deepEqual(loaded.issues, []);
  assert.deepEqual(loaded.duplicates, []);
  assert.deepEqual(loaded.conflicts, []);
  assert.deepEqual(loaded.stale, []);
  assert.ok(loaded.rules.length >= 24);
  assert.match(loaded.snapshot.checksum, /^[0-9a-f]{64}$/);
});

test("child types fall back to the parent rule and flag it", () => {
  const loaded = loadRules(defaultRulesDir());
  const r = findRule(loaded, "Microsoft.Sql/servers/elasticPools");
  assert.equal(r.via, "parent");
  assert.equal(r.rule?.resourceType, "Microsoft.Sql/servers");
  assert.equal(findRule(loaded, "Microsoft.Unknown/widgets").rule, null);
});

test("overlays with higher precedence win; same-precedence disagreement is a conflict", () => {
  const dir = mkdtempSync(join(tmpdir(), "rules-"));
  mkdirSync(join(dir, "azure"));
  mkdirSync(join(dir, "organization"));
  const base = JSON.parse(JSON.stringify(loadRules(defaultRulesDir()).byType.get("microsoft.storage/storageaccounts")![0]));
  writeFileSync(join(dir, "azure", "storage.json"), JSON.stringify([base]));
  const overlay = { ...base, ruleId: "org.test.storage", recommendedPattern: { ...base.recommendedPattern, disposition: "redesign" }, precedence: 100 };
  writeFileSync(join(dir, "organization", "o.json"), JSON.stringify([overlay]));
  const loaded = loadRules(dir);
  assert.equal(loaded.conflicts.length, 0);
  assert.equal(findRule(loaded, base.resourceType).rule?.ruleId, "org.test.storage");
  const clash = { ...overlay, ruleId: "org.test.storage2", recommendedPattern: { ...base.recommendedPattern, disposition: "retire" } };
  writeFileSync(join(dir, "organization", "o2.json"), JSON.stringify([clash]));
  assert.equal(loadRules(dir).conflicts.length, 1);
  const dupe = { ...base };
  writeFileSync(join(dir, "organization", "dupe.json"), JSON.stringify([dupe]));
  assert.equal(loadRules(dir).duplicates.length, 1);
});

test("snapshot comparison reports added/removed rules", () => {
  const cur = loadRules(defaultRulesDir()).snapshot;
  const prev = { ...cur, checksum: "x", files: cur.files.map((f) => ({ ...f, ruleIds: f.ruleIds.filter((i) => !i.includes("keyvault")) })) };
  const diff = compareSnapshots(prev, cur);
  assert.equal(diff.changed, true);
  assert.ok(diff.added.includes("azure.keyvault.vaults"));
});
