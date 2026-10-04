import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultIntent, validateRule, bandFor } from "./index.js";

test("defaultIntent labels every defaulted field as an assumption", () => {
  const i = defaultIntent({ destinationRegion: "westus3" });
  assert.ok(!i.assumedFields.includes("destinationRegion"));
  assert.ok(i.assumedFields.includes("rtoHours"));
  assert.ok(i.assumedFields.includes("sameTenant"));
});

test("defaultIntent forces cross-tenant operation when tenants differ", () => {
  const i = defaultIntent({ sameTenant: false, desiredOperation: "region-relocation" });
  assert.equal(i.desiredOperation, "cross-tenant-migration");
  assert.equal(i.sameSubscription, false);
});

test("validateRule rejects an unsupported rule without alternatives", () => {
  const issues = validateRule({
    ruleId: "azure.test.thing", ruleVersion: "1", provider: "Microsoft.Test", resourceType: "Microsoft.Test/things",
    sourceScope: ["region"], destinationScope: ["region"], tenantApplicability: "any",
    support: { resourceGroupMove: "unsupported", subscriptionMove: "unsupported", regionRelocation: "unsupported", crossTenant: "unsupported" },
    recommendedPattern: { disposition: "recreate-only", tool: "terraform-redeploy", infrastructure: "recreate", configuration: "reconstruct", identity: "not-applicable", data: "not-applicable", expectedDowntime: "minutes" },
    alternatives: [], documentationSources: [{ title: "t", url: "https://learn.microsoft.com/x", retrievedOn: "2026-10-03" }],
    reviewDate: "2027-04-01", confidence: 0.8, requiredEvidence: [], humanReviewRequired: false,
  });
  assert.ok(issues.some((i) => i.path === "alternatives"));
});

test("confidence bands", () => {
  assert.equal(bandFor(0.9), "high");
  assert.equal(bandFor(0.5), "medium");
  assert.equal(bandFor(0.1), "low");
});
