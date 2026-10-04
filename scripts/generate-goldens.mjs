#!/usr/bin/env node
/** Regenerate golden outputs for the sample inventory. Deterministic: fixed clock, assessment ID stripped. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Orchestrator } from "@amo/agents";
import { normalizeGolden } from "../tests/golden-files/normalize.mjs";

const csv = readFileSync("samples/resources-csv/sample-resources.csv", "utf8");
const o = new Orchestrator({ edition: "demo", now: () => new Date("2026-10-03T12:00:00Z") });
const { bundle } = await o.assessCsv(csv, { destinationRegion: "westus3", sameTenant: true, sameSubscription: true, downtimeTolerance: "hours" });
mkdirSync("samples/expected-reports", { recursive: true });
for (const f of ["reports/resource-decisions.csv", "reports/executive-summary.md", "reports/engineering-assessment.md", "terraform/main.tf", "runbooks/migration.md"]) {
  writeFileSync(`samples/expected-reports/${f.replace("/", "__")}`, normalizeGolden(bundle.files[f]));
}
console.log("goldens written to samples/expected-reports/");
