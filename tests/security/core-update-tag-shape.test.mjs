import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// core-update.yml refuses an upstream release tag that is not a plain vMAJOR.MINOR.PATCH. The tag is pasted into a sed
// command and into GITHUB_OUTPUT, in the job that later mints the App token, so a tag with shell or sed metacharacters,
// or a line break, must stop the run before it is used. These tests run the guard's own lines from the workflow with
// bash, so they fail if the guard is removed, loosened or moved after the first use.

const text = readFileSync(".github/workflows/core-update.yml", "utf8").replace(/\r\n/g, "\n");
const steps = text.split("\njobs:\n")[1].split(/^ {6}- /m).slice(1);
const refs = steps.filter((s) => /^id:\s*refs\s*$/.test(s.split("\n")[0]));
assert.equal(refs.length, 1, "core-update.yml must have exactly one step with id: refs");
const script = refs[0].split("run: |\n")[1].split("\n").map((line) => line.slice(10)).join("\n");
const lines = script.split("\n");
const start = lines.findIndex((l) => l.trimStart().startsWith('case "$latest" in'));
const end = lines.findIndex((l) => l.includes("=~") && l.includes("$latest"));
const guard = lines.slice(start, end + 1).join("\n");
const run = (tag) => spawnSync("bash", ["-c", guard, "_"], { env: { latest: tag }, encoding: "utf8" });

test("the guard sits before the tag is written to GITHUB_OUTPUT or used", () => {
  assert.ok(start >= 0 && end > start, "the single-line check must come before the shape check");
  assert.ok(script.indexOf('case "$latest" in') < script.indexOf('echo "latest=$latest"'));
});

for (const tag of ["v0.3.2", "v1.2.3", "v10.20.30"]) {
  test(`a plain release tag passes: ${tag}`, () => {
    const r = run(tag);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
}

for (const tag of ["v9|;etouch${IFS}PWNED;#", "v1.0.0\nchanged=true", "v1.0.0\r", "v1.2.3+build.7", "v1.2.3-rc.1", "v1.0", "1.2.3", "latest", ""]) {
  test(`anything else stops the run: ${JSON.stringify(tag)}`, () => {
    const r = run(tag);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::error::/);
  });
}
