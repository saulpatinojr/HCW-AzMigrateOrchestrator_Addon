import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLearnMoveSupport, normalizeLearnCell, diffRulesAgainstMatrix, loadRules, defaultRulesDir } from "./index.js";

const FIXTURE = `## Microsoft.Compute

| Resource type | Resource group | Subscription | Region move |
| ------------- | ----------- | ---------- | ----------- |
| availabilitysets | **Yes** | **Yes** | Yes |
| disks | **Yes** | **Yes** | Yes <br><br> Use [Azure Resource Mover](../../resource-mover/tutorial-move-region-virtual-machines.md) to move Azure VMs and related disks. |
| virtualmachinescalesets | **Yes** | **Yes** | No |

## Microsoft.Storage

| Resource type | Resource group | Subscription | Region move |
| ------------- | ----------- | ---------- | ----------- |
| storageaccounts | **Yes** | **Yes** | No <br><br> [Move an Azure Storage account to another region](../../storage/common/storage-account-move.md) |
| storageaccounts / something | Pending | Pending | No |
| storageaccounts / tableservices | Yes | Yes | No |
`;

test("normalizes Learn cells", () => {
  assert.equal(normalizeLearnCell("**Yes**"), "supported");
  assert.equal(normalizeLearnCell("No"), "unsupported");
  assert.equal(normalizeLearnCell("Yes - with restrictions"), "conditional");
  assert.equal(normalizeLearnCell("Pending"), "unknown");
  assert.equal(normalizeLearnCell("Yes <br> Use Resource Mover"), "conditional");
});

test("parses provider sections and fully qualifies types", () => {
  const rows = parseLearnMoveSupport(FIXTURE);
  assert.equal(rows.length, 6);
  assert.equal(rows[4].resourceType, "microsoft.storage/storageaccounts/something");
  assert.equal(rows[0].resourceType, "microsoft.compute/availabilitysets");
  assert.equal(rows[3].resourceType, "microsoft.storage/storageaccounts");
  assert.equal(rows[3].regionRelocation, "unsupported");
  assert.equal(rows[2].regionRelocation, "unsupported");
});

test("diff against the real corpus surfaces disagreements and uncovered types without false alarms on agreement", () => {
  const loaded = loadRules(defaultRulesDir());
  const { diffs, uncovered } = diffRulesAgainstMatrix(loaded.rules, parseLearnMoveSupport(FIXTURE));
  assert.ok(!diffs.some((d) => d.ruleId === "azure.storage.storageaccounts"), "storage rule agrees with fixture");
  assert.ok(!diffs.some((d) => d.ruleId === "azure.compute.virtualmachinescalesets"));
  assert.ok(uncovered.includes("microsoft.storage/storageaccounts/tableservices"));
  assert.ok(!uncovered.includes("microsoft.storage/storageaccounts/something"), "pending rows are not actionable");
});
