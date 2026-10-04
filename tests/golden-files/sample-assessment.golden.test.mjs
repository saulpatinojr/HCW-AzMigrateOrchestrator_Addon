import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Orchestrator } from "@amo/agents";
import { normalizeGolden } from "./normalize.mjs";

test("sample inventory produces the committed golden reports (run `npm run goldens:update` after an intentional change)", async () => {
  const csv = readFileSync("samples/resources-csv/sample-resources.csv", "utf8");
  const o = new Orchestrator({ edition: "demo", now: () => new Date("2026-10-03T12:00:00Z") });
  const { bundle } = await o.assessCsv(csv, { destinationRegion: "westus3", sameTenant: true, sameSubscription: true, downtimeTolerance: "hours" });
  for (const f of ["reports/resource-decisions.csv", "reports/executive-summary.md", "reports/engineering-assessment.md", "terraform/main.tf", "runbooks/migration.md"]) {
    assert.equal(normalizeGolden(bundle.files[f]), readFileSync(`samples/expected-reports/${f.replace("/", "__")}`, "utf8"), `golden mismatch: ${f}`);
  }
});
