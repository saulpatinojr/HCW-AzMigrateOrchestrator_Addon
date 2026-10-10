import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";

/**
 * The web-front edition must be technically unable to reach Azure or execute anything (ADR-0008, ADR-0028). It depends only
 * on the published packages; the Azure clients live upstream and are never published.
 */
const CORE = "@hybridcloudworks/migration-core";
const UI = "@hybridcloudworks/migration-ui";
const FORBIDDEN_STRINGS = [`${CORE}/azure-auth`, `${CORE}/azure-arm`, `${CORE}/azure-execution`, "AzureResourceGraphDiscoveryProvider", "@azure/", "controlled-execution", "destructive-execution", "@amo/"];
const srcFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? srcFiles(join(dir, e.name)) : /\.(tsx?|mjs)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

test("every workspace depends only on the two published packages plus React", () => {
  for (const a of readdirSync("apps")) {
    const pkg = JSON.parse(readFileSync(join("apps", a, "package.json"), "utf8"));
    for (const d of Object.keys(pkg.dependencies ?? {})) assert.ok([CORE, UI, "react", "react-dom"].includes(d), `${a} depends on ${d}`);
  }
  for (const a of ["appliance-api", "appliance-web", "worker", "cli"]) assert.ok(!existsSync(join("apps", a)), `apps/${a} belongs upstream`);
  assert.ok(!existsSync("packages"), "this edition has no internal packages; the engine arrives as a published package");
});

test("the installed core exposes no Azure client subpath and contains no Azure endpoint", () => {
  const dir = realpathSync(join("node_modules", CORE));
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const bad of ["./azure-auth", "./azure-arm", "./azure-execution"]) assert.ok(!(bad in pkg.exports), `${CORE} exports ${bad}`);
  assert.ok("./azure-discovery" in pkg.exports, "the DiscoveryProvider interface subpath is expected");
  for (const f of walk(join(dir, "dist")).filter((f) => f.endsWith(".js"))) assert.ok(!readFileSync(f, "utf8").includes("management.azure.com"), `${f} references an Azure endpoint`);
});

test("lab-api never references authenticated discovery, execution or internal upstream names", () => {
  for (const f of srcFiles("apps/lab-api/src")) {
    const text = readFileSync(f, "utf8");
    for (const bad of FORBIDDEN_STRINGS) assert.ok(!text.includes(bad), `${f} references ${bad}`);
  }
});

test("lab-web is the pane app: exactly the UI package, react and react-dom; no Azure SDK in src or dist; the harness is gone", () => {
  const pkg = JSON.parse(readFileSync("apps/lab-web/package.json", "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), [UI, "react", "react-dom"].sort());
  for (const f of srcFiles("apps/lab-web/src")) assert.ok(!readFileSync(f, "utf8").includes("@azure/"), `${f} references the Azure SDK`);
  if (existsSync("apps/lab-web/dist")) for (const f of walk("apps/lab-web/dist")) assert.ok(!readFileSync(f, "utf8").includes("@azure/"), `${f} references the Azure SDK`);
  assert.ok(!existsSync("apps/ui-harness"), "apps/ui-harness was replaced by the pane app apps/lab-web");
  assert.ok(!existsSync("apps/lab-web/public/index.html"), "the vanilla page was replaced by the pane app");
});
