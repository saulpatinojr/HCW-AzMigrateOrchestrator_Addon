import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * _Addon holds the lab, the UI package and the shared core. It must be technically unable to reach Azure or execute
 * anything (§3.11, ADR-0008, ADR-0017, ADR-0027). The Azure-touching packages live in saulpatinojr/HCW-AzMigrateOrchestrator_App.
 */
const AZURE_PACKAGES = ["@amo/azure-auth", "@amo/azure-arm", "@amo/azure-execution"];
const LAB_FORBIDDEN_IMPORTS = [...AZURE_PACKAGES, "AzureResourceGraphDiscoveryProvider", "@azure/", "controlled-execution", "destructive-execution"];
const srcFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? srcFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
const workspaces = () => [...readdirSync("packages").map((d) => join("packages", d)), ...readdirSync("apps").map((d) => join("apps", d))].filter((d) => existsSync(join(d, "package.json")));

test("no workspace in this repository depends on an Azure-touching package or SDK", () => {
  for (const w of workspaces()) {
    const pkg = JSON.parse(readFileSync(join(w, "package.json"), "utf8"));
    const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];
    for (const d of deps) assert.ok(!AZURE_PACKAGES.includes(d) && !d.startsWith("@azure/"), `${w} depends on ${d}`);
  }
  for (const a of ["appliance-api", "appliance-web", "worker"]) assert.ok(!existsSync(join("apps", a)), `apps/${a} belongs to saulpatinojr/HCW-AzMigrateOrchestrator_App`);
  for (const p of AZURE_PACKAGES) assert.ok(!existsSync(join("packages", p.replace("@amo/", ""))), `${p} belongs to saulpatinojr/HCW-AzMigrateOrchestrator_App`);
});

test("@amo/azure-discovery is interface-only: no Azure endpoints, no network calls, domain types only", () => {
  const pkg = JSON.parse(readFileSync("packages/azure-discovery/package.json", "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ["@amo/domain"]);
  for (const f of srcFiles("packages/azure-discovery/src")) {
    const text = readFileSync(f, "utf8");
    for (const bad of ["management.azure.com", "fetch(", "@amo/azure-auth", "ARM_SCOPE"]) assert.ok(!text.includes(bad), `${f} contains ${bad}`);
  }
});

test("lab-api never references authenticated discovery or execution-level authorization", () => {
  const pkg = JSON.parse(readFileSync("apps/lab-api/package.json", "utf8"));
  assert.ok(!Object.keys(pkg.dependencies).includes("@amo/azure-discovery"), "lab-api must not depend on @amo/azure-discovery");
  for (const f of srcFiles("apps/lab-api/src")) {
    const text = readFileSync(f, "utf8");
    for (const bad of LAB_FORBIDDEN_IMPORTS) assert.ok(!text.includes(bad), `${f} references ${bad}`);
  }
});

test("lab-web is static: no build step, no runtime dependencies, no Azure SDK", () => {
  const pkg = JSON.parse(readFileSync("apps/lab-web/package.json", "utf8"));
  assert.equal(pkg.dependencies, undefined);
  for (const f of readdirSync("apps/lab-web/public")) assert.ok(!readFileSync(join("apps/lab-web/public", f), "utf8").includes("@azure/"));
});

test("cli is lab-side: it never depends on azure-discovery directly", () => {
  const cli = JSON.parse(readFileSync("apps/cli/package.json", "utf8"));
  assert.ok(!Object.keys(cli.dependencies).includes("@amo/azure-discovery"), "cli must not depend on azure-discovery; authenticated discovery belongs to the appliance");
});

test("packages/contracts is the only seam the UI package uses from the core", () => {
  const pkg = JSON.parse(readFileSync("packages/ui/package.json", "utf8"));
  const coreDeps = Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith("@amo/"));
  assert.deepEqual(coreDeps.sort(), ["@amo/contracts", "@amo/domain"]);
});
