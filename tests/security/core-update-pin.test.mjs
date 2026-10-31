import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PinError, bump, checkLock, tarballUrl } from "../../scripts/core-update-pin.mjs";

// scripts/core-update-pin.mjs is the only project code the core-update pull-request job runs before it mints the
// GitHub App token: it moves the two tarball URLs in package.json and checks the lock npm writes. These tests run it
// on this repository's own package.json and package-lock.json, so they also fail if those files drift from the shape
// the scheduled run expects.

const PKG = readFileSync("package.json", "utf8");
const LOCK = readFileSync("package-lock.json", "utf8");
const pinned = PKG.match(/releases\/download\/(v[0-9]+\.[0-9]+\.[0-9]+)\/hybridcloudworks-migration-core-/)[1];
const HOSTILE = ["v9|;etouch${IFS}PWNED;#", "v1.0.0\nchanged=true", "v1.0.0 ", "v1.0", "v1.0.0-rc.1", "v1.2.3+build.7", "1.0.0", "", undefined];

test("this repository pins both packages to the same plain release tag, and its lock passes the check", () => {
  for (const p of ["migration-core", "migration-ui"]) assert.ok(PKG.includes(JSON.stringify(tarballUrl(pinned, p))), p);
  assert.deepEqual(checkLock(LOCK, PKG, pinned), []);
});

test("bump moves both URLs and nothing else, keeping the file's formatting", () => {
  const out = bump(PKG, pinned, "v99.0.0");
  const changed = out.split("\n").filter((l, i) => l !== PKG.split("\n")[i]);
  assert.equal(changed.length, 2);
  assert.equal(out.split("\n").length, PKG.split("\n").length);
  const deps = JSON.parse(out).dependencies;
  assert.equal(deps["@hybridcloudworks/migration-core"], tarballUrl("v99.0.0", "migration-core"));
  assert.equal(deps["@hybridcloudworks/migration-ui"], tarballUrl("v99.0.0", "migration-ui"));
  assert.match(deps["@hybridcloudworks/migration-ui"], /\/releases\/download\/v99\.0\.0\/hybridcloudworks-migration-ui-99\.0\.0\.tgz$/);
});

for (const tag of HOSTILE) {
  test(`bump refuses a malformed tag: ${JSON.stringify(tag)}`, () => {
    assert.throws(() => bump(PKG, pinned, tag), PinError);
    assert.throws(() => bump(PKG, tag, "v99.0.0"), PinError);
    assert.throws(() => checkLock(LOCK, PKG, tag), PinError);
  });
}

test("bump refuses when the pin is not the tag it is moving from, or the tag does not change", () => {
  assert.throws(() => bump(PKG, "v0.0.1", "v99.0.0"), /does not pin/);
  assert.throws(() => bump(PKG, pinned, pinned), /is the pinned tag/);
});

test("bump refuses a package.json where the two packages point at different tags", () => {
  const mixed = PKG.replace(tarballUrl(pinned, "migration-ui"), tarballUrl("v0.0.1", "migration-ui"));
  assert.throws(() => bump(mixed, pinned, "v99.0.0"), /does not pin @hybridcloudworks\/migration-ui/);
});

test("bump refuses when an old URL appears more than once (it would move only one of them)", () => {
  const twice = PKG.replace('"description": ', `"x": ${JSON.stringify(tarballUrl(pinned, "migration-core"))},\n  "description": `);
  assert.throws(() => bump(twice, pinned, "v99.0.0"), /exactly once/);
});

const lockWith = (change) => {
  const lock = JSON.parse(LOCK);
  change(lock.packages);
  return JSON.stringify(lock, null, 2);
};

const BAD_LOCKS = {
  "an upstream entry on another URL": [(p) => (p["node_modules/@hybridcloudworks/migration-ui"].resolved = "https://example.invalid/ui.tgz"), /does not resolve/],
  "an upstream entry without integrity": [(p) => delete p["node_modules/@hybridcloudworks/migration-core"].integrity, /no sha512/],
  "an upstream entry with a sha1 integrity": [(p) => (p["node_modules/@hybridcloudworks/migration-core"].integrity = "sha1-" + "a".repeat(27) + "="), /no sha512/],
  "a registry package from git": [(p) => (p["node_modules/react"].resolved = "git+ssh://git@github.com/x/react.git"), /npm registry/],
  "a registry package from another host": [(p) => (p["node_modules/react"].resolved = "https://registry.npmjs.org.example.invalid/react.tgz"), /npm registry/],
  "a registry package without integrity": [(p) => delete p["node_modules/react"].integrity, /node_modules\/react has no sha512/],
  "a link outside the workspaces": [(p) => (p["node_modules/@amo/lab-api"].resolved = "../elsewhere"), /links outside/],
  "an unexpected top-level entry": [(p) => (p["scripts/evil"] = { version: "1.0.0" }), /unexpected lock entry/],
  "a missing upstream entry": [(p) => delete p["node_modules/@hybridcloudworks/migration-ui"], /no entry/],
};

for (const [name, [change, message]] of Object.entries(BAD_LOCKS)) {
  test(`check-lock refuses ${name}`, () => {
    const problems = checkLock(lockWith(change), PKG, pinned);
    assert.ok(problems.some((p) => message.test(p)), problems.join("\n"));
  });
}

test("check-lock refuses a lock that still pins the previous release", () => {
  const next = bump(PKG, pinned, "v99.0.0");
  const problems = checkLock(LOCK, next, "v99.0.0");
  assert.ok(problems.some((p) => /root entry does not pin/.test(p)));
  assert.ok(problems.some((p) => /does not resolve to the v99\.0\.0 release tarball/.test(p)));
});
