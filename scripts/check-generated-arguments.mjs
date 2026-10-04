#!/usr/bin/env node
/** Validate a bundle's argument-manifest.json against `terraform providers schema -json` output. Exit 1 on issues. */
import { readFileSync } from "node:fs";
import { FileSchemaSource, checkArguments } from "@amo/terraform-generator";
const [manifestPath, schemaPath] = process.argv.slice(2);
if (!manifestPath || !schemaPath) { console.error("usage: check-generated-arguments.mjs <argument-manifest.json> <schema.json>"); process.exit(2); }
const issues = await checkArguments(JSON.parse(readFileSync(manifestPath, "utf8")), new FileSchemaSource(JSON.parse(readFileSync(schemaPath, "utf8"))));
for (const i of issues) console.error(`${i.problem}: ${i.resourceType}.${i.argument}`);
console.log(issues.length ? `${issues.length} issue(s)` : "all generated arguments exist in the provider schema");
process.exit(issues.length ? 1 : 0);
