import { test } from "node:test";
import assert from "node:assert/strict";
import { AzureResourceGraphDiscoveryProvider, FixtureDiscoveryProvider, assertDemoCannotUseAzure } from "./index.js";

test("demo edition cannot use an authenticated provider", () => {
  const p = new AzureResourceGraphDiscoveryProvider({ tenantId: "t", credentialKind: "managed-identity" });
  assert.throws(() => assertDemoCannotUseAzure(p, "demo"));
  assert.doesNotThrow(() => assertDemoCannotUseAzure(new FixtureDiscoveryProvider([]), "demo"));
});
test("resource graph adapter fails explicitly rather than faking data", async () => {
  await assert.rejects(new AzureResourceGraphDiscoveryProvider({ tenantId: "t", credentialKind: "azure-cli" }).discover());
});
