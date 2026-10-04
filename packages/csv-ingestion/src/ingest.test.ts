import { test } from "node:test";
import assert from "node:assert/strict";
import { ingestResourcesCsv, parseCsv, parseResourceId, looksLikeFormula, csvSafe } from "./index.js";

const SUB = "11111111-2222-3333-4444-555555555555";
const header = "NAME,TYPE,RESOURCE GROUP,LOCATION,SUBSCRIPTION,SUBSCRIPTION ID,RESOURCE ID,TAGS";
const vmId = `/subscriptions/${SUB}/resourceGroups/rg-app/providers/Microsoft.Compute/virtualMachines/vm-app-01`;

test("parses a BOM-prefixed, quoted portal export", () => {
  const csv = `\uFEFF${header}\r\n"vm-app-01",microsoft.compute/virtualmachines,rg-app,"East US",Prod,${SUB},${vmId},"env: prod; app: billing"\r\n`;
  const r = ingestResourcesCsv(csv);
  assert.equal(r.errors.length, 0);
  assert.equal(r.resources.length, 1);
  const vm = r.resources[0];
  assert.equal(vm.type, "Microsoft.Compute/virtualMachines");
  assert.equal(vm.location, "eastus");
  assert.deepEqual(vm.tags, { env: "prod", app: "billing" });
  assert.equal(vm.parsedId.valid, true);
});

test("sniffs semicolon delimiter and rejects missing required columns", () => {
  const p = parseCsv("NAME;LOCATION\nx;y\n");
  assert.equal(p.delimiter, ";");
  const r = ingestResourcesCsv("NAME;LOCATION\nx;y\n");
  assert.ok(r.errors[0].includes("type"));
});

test("detects duplicates and formula injection", () => {
  const csv = `${header}\nvm1,Microsoft.Compute/virtualMachines,rg,eastus,s,${SUB},${vmId},\nvm1,Microsoft.Compute/virtualMachines,rg,eastus,s,${SUB},${vmId},\n=cmd|' /C calc'!A0,Microsoft.Compute/disks,rg,eastus,s,${SUB},/subscriptions/${SUB}/resourceGroups/rg/providers/Microsoft.Compute/disks/d1,\n`;
  const r = ingestResourcesCsv(csv);
  assert.equal(r.duplicateCount, 1);
  assert.equal(r.resources.length, 2);
  assert.ok(r.resources[1].warnings.some((w) => w.includes("formula")));
  assert.ok(csvSafe("=1+1").startsWith("'"));
  assert.equal(looksLikeFormula("-12"), false);
});

test("resource id parsing handles child resources and resource groups", () => {
  const sub = parseResourceId(`/subscriptions/${SUB}/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/sn`);
  assert.equal(sub.fullType, "Microsoft.Network/virtualNetworks/subnets");
  assert.equal(sub.name, "sn");
  assert.ok(sub.parentId?.endsWith("/virtualNetworks/vnet"));
  const rg = parseResourceId(`/subscriptions/${SUB}/resourceGroups/rg`);
  assert.equal(rg.fullType, "Microsoft.Resources/resourceGroups");
  assert.equal(parseResourceId("not-an-id").valid, false);
});

test("enforces byte and row limits", () => {
  assert.ok(ingestResourcesCsv("a,b", { maxBytes: 1 }).errors.length > 0);
  const rows = Array.from({ length: 12 }, (_, i) => `r${i},Microsoft.Compute/disks`).join("\n");
  const r = ingestResourcesCsv(`NAME,TYPE\n${rows}`, { maxRows: 5 });
  assert.ok(r.warnings.some((w) => w.includes("row limit")));
});

test("missing Resource ID column is a labelled limitation, not an error", () => {
  const r = ingestResourcesCsv("NAME,TYPE,LOCATION\nvm,Microsoft.Compute/virtualMachines,eastus\n");
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some((w) => w.includes("no Resource ID column")));
  assert.equal(r.resources[0].resourceId, null);
});
