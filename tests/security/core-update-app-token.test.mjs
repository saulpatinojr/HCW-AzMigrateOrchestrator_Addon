import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// core-update.yml opens its bump pull request with the HCW Main Admin GitHub App token, never with GITHUB_TOKEN. A
// pull request opened with GITHUB_TOKEN starts no workflow, so the required checks never run on it and it can never
// merge. The App's client ID is the repository variable HCW_MAIN_ADMIN_CLIENT_ID and its private key is the
// repository secret HCW_MAIN_ADMIN_PRIVATE_KEY; the jobs do not run in an environment.
// The workflow has two jobs: `bump` installs and tests the new upstream release (its code and install scripts run
// there) and holds no secret; `pull-request` runs none of that code, regenerates the bump with main's own pin script
// and a lock-only, script-free npm install, and only then mints the token. These are static checks of the workflow
// text; they do not prove the credential works. A run with probe=true does (see the header of the workflow).
// tests/security/core-update-apply.test.mjs runs the apply step itself against tampered artifacts.

const text = readFileSync(".github/workflows/core-update.yml", "utf8").replace(/\r\n/g, "\n");
const jobs = text.split("\njobs:\n")[1];
const jobNames = [...jobs.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
const jobBodies = jobs.split(/^ {2}[A-Za-z0-9_-]+:\s*$/m).slice(1);
const job = Object.fromEntries(jobNames.map((n, i) => [n, jobBodies[i]]));
const stepsOf = (body) => body.split(/^ {6}- /m).slice(1);
const steps = stepsOf(jobs); // the steps of both jobs, in order
const using = (action) => steps.filter((s) => new RegExp(`^\\s*uses:\\s*${action}@`, "m").test(s));
const only = (action) => {
  const found = using(action);
  assert.equal(found.length, 1, `expected exactly one step using ${action}`);
  return found[0];
};
const withId = (id, body = jobs) => {
  const found = stepsOf(body).filter((s) => new RegExp(`^\\s*id:\\s*${id}\\s*$`, "m").test(s));
  assert.equal(found.length, 1, `expected exactly one step with id: ${id}`);
  return found[0];
};
const APP_TOKEN = /\$\{\{\s*steps\.app-token\.outputs\.token\s*\}\}/;
// The shell of a job's `run:` blocks, without comment lines.
const commands = (body) =>
  [...body.matchAll(/^ {8}run: (?:\|\n((?:(?: {10}.*)?\n)*)|(.*)$)/gm)]
    .map((m) => m[1] ?? m[2])
    .join("\n")
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");
const NPM_CLI = '"${RUNNER_TEMP}/npm-pinned/package/bin/npm-cli.js"';
const LOCK_FLAGS = [
  "install",
  "--package-lock-only",
  "--ignore-scripts",
  "--allow-git=none",
  "--allow-remote=root",
  "--allow-file=none",
  "--allow-directory=root",
  "--no-audit",
  "--no-fund",
  "--no-update-notifier",
];

test("the pull request is opened with the App token, never GITHUB_TOKEN", () => {
  const app = only("actions/create-github-app-token");
  const pr = only("peter-evans/create-pull-request");
  assert.match(app, /^\s*id:\s*app-token\s*$/m);
  assert.ok(steps.indexOf(app) < steps.indexOf(pr), "the App token step must come before the step that opens the pull request");
  assert.match(pr, new RegExp(`^\\s*token:\\s*${APP_TOKEN.source}\\s*$`, "m"));
  assert.ok(!/GITHUB_TOKEN/.test(pr), "create-pull-request must not be given GITHUB_TOKEN");
});

test("every step that runs gh pr uses the App token, after it was minted", () => {
  const app = only("actions/create-github-app-token");
  const ghPr = steps.filter((s) => /\bgh pr\b/.test(s));
  assert.ok(ghPr.length >= 1, "the auto-merge step is missing");
  for (const s of ghPr) {
    assert.match(s, new RegExp(`GH_TOKEN:\\s*${APP_TOKEN.source}`));
    assert.ok(steps.indexOf(app) < steps.indexOf(s));
  }
});

test("the token is minted late, after the compatibility check and after the artifact was checked", () => {
  const app = only("actions/create-github-app-token");
  const compat = withId("compat");
  const apply = withId("apply");
  assert.ok(steps.indexOf(compat) < steps.indexOf(app), "the App token must be minted after the tests have run");
  assert.ok(steps.indexOf(apply) < steps.indexOf(app), "the artifact must be checked and applied before the token is minted");
});

test("the token action is pinned to a full commit SHA", () => {
  const app = only("actions/create-github-app-token");
  assert.match(app, /^\s*uses:\s*actions\/create-github-app-token@[0-9a-f]{40}(\s|$)/m);
});

test("the App credential is the HCW Main Admin variable and secret, and only the token step gets the key", () => {
  const app = only("actions/create-github-app-token");
  assert.match(app, /^\s*client-id:\s*\$\{\{\s*vars\.HCW_MAIN_ADMIN_CLIENT_ID\s*\}\}\s*$/m);
  assert.match(app, /^\s*private-key:\s*\$\{\{\s*secrets\.HCW_MAIN_ADMIN_PRIVATE_KEY\s*\}\}\s*$/m);
  const withKey = steps.filter((s) => s.includes("secrets.HCW_MAIN_ADMIN_PRIVATE_KEY"));
  assert.deepEqual(withKey, [app], "the private key must reach the token step and no other step");
});

test("the workflow reads no other secrets", () => {
  const names = new Set([...text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1]));
  assert.deepEqual([...names].sort(), ["GITHUB_TOKEN", "HCW_MAIN_ADMIN_PRIVATE_KEY"]);
  for (const leak of ["toJSON(secrets", "secrets[", "secrets: inherit"]) {
    assert.ok(!text.includes(leak), `${leak} would hand more than the one key to a step`);
  }
});

test("the App token is limited to this repository", () => {
  const app = only("actions/create-github-app-token");
  // With `owner` set and `repositories` empty the action mints a token for every repository of the installation.
  // With no `owner`, an empty `repositories` falls back to the current repository, so this shape fails closed.
  assert.ok(!/^\s*owner:/m.test(app), "owner must not be set: an empty repositories would then widen the token");
  // One value, this repository's full name: not a list, not a wildcard, not another repository.
  assert.match(app, /^\s*repositories:\s*\$\{\{\s*github\.repository\s*\}\}\s*$/m);
});

test("the App token permissions are exactly Contents write and Pull requests write", () => {
  const app = only("actions/create-github-app-token");
  const granted = Object.fromEntries([...app.matchAll(/^\s*permission-([a-z-]+):\s*([a-z]+)\b/gm)].map((m) => [m[1], m[2]]));
  assert.deepEqual(granted, { contents: "write", "pull-requests": "write" });
});

test("the old App credential is gone", () => {
  for (const old of ["admin-ops", "APP_CLIENT_ID", "APP_PRIVATE_KEY"]) {
    assert.ok(!text.includes(old), `${old} must not appear in core-update.yml`);
  }
  assert.ok(!/portfolio/i.test(text), "the Portfolio App must not appear in core-update.yml");
});

test("no job runs in an environment", () => {
  // The credential is a repository variable and secret, so no environment is needed (or wanted) on a job.
  assert.ok(!/^\s*environment:/m.test(text));
});

test("two jobs, bump then pull-request, each with contents: read, and an empty top-level permissions block", () => {
  assert.match(text, /^permissions: \{\}\s*$/m, "top-level permissions must stay empty");
  assert.deepEqual(jobNames, ["bump", "pull-request"], "expected the jobs bump and pull-request, in that order");
  assert.equal((text.match(/^\s*permissions:\s*\{/gm) ?? []).length, 1, "only the top level may use the inline form");
  for (const [name, body] of Object.entries(job)) {
    assert.match(body, /^ {4}permissions:\n {6}contents:\s*read\s*\n(?! {6}\S)/m, `${name}: contents: read only`);
  }
  assert.match(job["pull-request"], /^ {4}needs:\s*bump\s*$/m);
});

test("GITHUB_TOKEN is read-only: no write grant anywhere", () => {
  // The App token's inputs are `permission-*`, a different key; any other `<name>: write` would widen GITHUB_TOKEN.
  assert.ok(!/^[ \t]+(?!permission-)[a-z-]+:[ \t]*write[ \t]*$/m.test(text), "a permissions: block grants write");
});

test("the job that runs upstream code holds no secret, and a read-only token reaches only the refs step", () => {
  const bump = job.bump;
  for (const word of ["HCW_MAIN_ADMIN", "create-github-app-token", "create-pull-request", "gh pr"]) {
    assert.ok(!bump.includes(word), `the bump job must not contain ${word}`);
  }
  const withToken = stepsOf(bump).filter((s) => /secrets\.|GH_TOKEN/.test(s));
  assert.equal(withToken.length, 1);
  assert.match(withToken[0], /^id:\s*refs\s*$/m);
  assert.ok(!/\b(npm|npx|node)\b/.test(withToken[0].split("run: |")[1]), "the refs step must not run project code");
});

test("the job that holds the key runs no package or project code: only main's pin script and a lock-only npm", () => {
  const sh = commands(job["pull-request"]);
  assert.ok(sh.includes("refuse()") && sh.includes("gh pr merge"), "the run blocks of the pull-request job were not found");
  // No npm or npx command at all (the pinned npm is only ever run as `node <its npm-cli.js>`), no install, no tests.
  for (const word of [/(^|[\s;|&(])npm\s/m, /\bnpx\b/, /\bnpm-cli\.js"?\s+(ci|test|run|exec|rebuild|install-test|it)\b/, /\bplaywright\b/, /\byarn\b|\bpnpm\b|\bcorepack\b/]) {
    assert.ok(!word.test(sh), `the pull-request job must not run project or package code (${word})`);
  }
  // Every node invocation is main's pin script or the pinned npm.
  const nodeCalls = [...sh.matchAll(/\bnode\s+(\S+)/g)].map((m) => m[1]);
  assert.ok(nodeCalls.length >= 4);
  for (const target of nodeCalls) assert.ok(["scripts/core-update-pin.mjs", NPM_CLI].includes(target), `node ${target}`);
  // The pinned npm only reports its version or writes the lock, and the lock write carries every refusal flag.
  const npmCalls = [...sh.matchAll(/\bnode\s+"\$\{RUNNER_TEMP\}\/npm-pinned\/package\/bin\/npm-cli\.js"([^\n|)]*)/g)].map((m) => m[1].trim());
  assert.deepEqual(npmCalls.filter((c) => c !== "--version"), [LOCK_FLAGS.join(" ")]);
  // The pin script: only its two commands.
  const pinCalls = [...sh.matchAll(/\bnode\s+scripts\/core-update-pin\.mjs\s+(\S+)/g)].map((m) => m[1]);
  assert.deepEqual(pinCalls, ["bump", "check-lock"]);
});

test("the pull-request job uses only the actions it needs, and no cache", () => {
  const actions = [...job["pull-request"].matchAll(/^\s*(?:- )?uses:\s*([^@\s]+)@/gm)].map((m) => m[1]);
  assert.deepEqual(actions, [
    "actions/checkout",
    "actions/download-artifact",
    "actions/setup-node",
    "actions/create-github-app-token",
    "peter-evans/create-pull-request",
  ]);
  // The bump job ran upstream code that could write an Actions cache; the key's job restores none.
  const setup = stepsOf(job["pull-request"]).find((s) => /uses:\s*actions\/setup-node@/.test(s));
  assert.match(setup, /package-manager-cache:\s*false\b/);
  assert.ok(!/\bcache:|cache-dependency-path/.test(setup.replace(/package-manager-cache:\s*false/, "")), "no cache input");
  assert.ok(!/actions\/cache\b/.test(text));
});

test("both jobs install the same npm, checked against its sha256, and run the same lock command", () => {
  assert.match(text, /^ {2}NPM_VERSION: [0-9]+\.[0-9]+\.[0-9]+$/m);
  assert.match(text, /^ {2}NPM_SHA256: [0-9a-f]{64}$/m);
  const npmStep = (body) => stepsOf(body).filter((s) => /^\s*name: npm, hash-checked/m.test(s));
  const [a, b] = [npmStep(job.bump), npmStep(job["pull-request"])];
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  const script = (s) => s.split("run: |\n")[1];
  assert.equal(script(a[0]), script(b[0]), "the two npm steps must be the same script");
  assert.match(script(a[0]), /sha256sum -c/);
  assert.match(script(a[0]), /npm-\$\{NPM_VERSION\}\.tgz/);
  const lockLine = (body) => commands(body).split("\n").filter((l) => l.includes("--package-lock-only")).map((l) => l.trim().split(" || ")[0]);
  assert.deepEqual(lockLine(job.bump), lockLine(job["pull-request"]));
  assert.equal(lockLine(job.bump).length, 1);
});

test("the artifact is handed over with the outcome only, and the outcome alone never turns on auto-merge", () => {
  assert.equal(using("actions/upload-artifact").length, 1);
  assert.ok(job.bump.includes("actions/upload-artifact@"));
  const merge = steps.filter((s) => /\bgh pr merge\b/.test(s));
  assert.equal(merge.length, 1);
  const condition = merge[0].split("\n", 1)[0];
  assert.ok(condition.includes("vars.CORE_AUTOMERGE == 'true'") && condition.includes("steps.apply.outputs.outcome == 'success'"));
  assert.ok(!/steps\.compat\./.test(job["pull-request"]), "the pull-request job reads the outcome from its own apply step");
});

test("every action is pinned to a full commit SHA", () => {
  const uses = [...text.matchAll(/^[ \t]*(?:- )?uses:[ \t]*(\S+)/gm)].map((m) => m[1]).filter((u) => !u.startsWith("./"));
  assert.ok(uses.length >= 4);
  for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `${u} is not pinned to a commit SHA`);
});

test("a probe run never reaches a step that writes", () => {
  // A manual run with probe=true must stay read-only even when a newer release exists (changed == 'true').
  const writers = steps.filter((s) => s.includes("peter-evans/create-pull-request@") || /\bgh pr\b/.test(s));
  assert.equal(writers.length, 2, "expected the pull request step and the auto-merge step");
  for (const s of writers) assert.match(s, /^\s*(?:- )?if:.*!inputs\.probe/m, "a step that writes must be skipped on a probe");
});

test("the probe step only reads, and fails if the token covers more than this repository", () => {
  const probe = steps.filter((s) => /^\s*if:\s*inputs\.probe\s*$/m.test(s));
  assert.equal(probe.length, 1, "expected exactly one probe step");
  assert.match(probe[0], /gh api "repos\/\$\{REPO\}"/);
  assert.match(probe[0], /gh api installation\/repositories/);
  assert.match(probe[0], /test "\$\{covered\}" = "\$\{REPO\}"/);
  // `gh api` turns into a POST as soon as it is given a field, so fields and bodies are as forbidden as -X, with
  // the value attached (-XPOST, -fname=value) or separate.
  assert.ok(!/\bgh pr\b|\bgit\b|--method|\s-[XfF]|--field|--raw-field|--input/.test(probe[0]), "the probe must not write");
});
