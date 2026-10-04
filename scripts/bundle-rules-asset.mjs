#!/usr/bin/env node
/** Write rules/{azure,organization}/*.json into one JSON map {relativePath: content} for the SEA asset. */
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { listRuleFiles, defaultRulesDir } from "@amo/evidence-engine";
const dir = defaultRulesDir();
const map = Object.fromEntries(listRuleFiles(dir).map((f) => [relative(dir, f), readFileSync(f, "utf8")]));
writeFileSync(process.argv[2] ?? "rules.json", JSON.stringify(map));
console.log(`${Object.keys(map).length} rule files bundled`);
