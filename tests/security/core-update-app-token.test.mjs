import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// core-update.yml opens its bump pull request with the HCW Main Admin GitHub App token, never with GITHUB_TOKEN. A
// pull request opened with GITHUB_TOKEN starts no workflow, so the required checks never run on it and it can never
// merge. The App's client ID is the repository variable HCW_MAIN_ADMIN_CLIENT_ID and its private key is the
// repository secret HCW_MAIN_ADMIN_PRIVATE_KEY; the job does not run in an environment. These are static checks of the
// workflow text; they do not prove the credential works. A run with probe=true does (see the header of the workflow).

const text = readFileSync(".github/workflows/core-update.yml", "utf8").replace(/\r\n/g, "\n");
const jobs = text.split("\njobs:\n")[1];
const steps = jobs.split(/^ {6}- /m).slice(1); // the steps of the one job
const using = (action) => steps.filter((s) => new RegExp(`^\\s*uses:\\s*${action}@`, "m").test(s));
const only = (action) => {
  const found = using(action);
  assert.equal(found.length, 1, `expected exactly one step using ${action}`);
  return found[0];
};
const APP_TOKEN = /\$\{\{\s*steps\.app-token\.outputs\.token\s*\}\}/;

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

test("the token is minted late, after the compatibility check", () => {
  const app = only("actions/create-github-app-token");
  const compat = steps.filter((s) => /^\s*id:\s*compat\s*$/m.test(s));
  assert.equal(compat.length, 1, "expected exactly one compatibility step");
  assert.ok(steps.indexOf(compat[0]) < steps.indexOf(app), "the App token must be minted after the tests have run");
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

test("the job does not run in an environment", () => {
  // The credential is a repository variable and secret, so no environment is needed (or wanted) on the job.
  assert.ok(!/^\s*environment:/m.test(text));
});

test("one job, and an empty top-level permissions block", () => {
  assert.match(text, /^permissions: \{\}\s*$/m, "top-level permissions must stay empty");
  assert.equal((jobs.match(/^ {2}[A-Za-z0-9_-]+:\s*$/gm) ?? []).length, 1, "expected exactly one job");
  assert.equal((text.match(/^\s*permissions:\s*\{/gm) ?? []).length, 1, "only the top level may use the inline form");
});

test("GITHUB_TOKEN is read-only: contents: read on the job, no write grant anywhere", () => {
  assert.match(text, /^ {4}permissions:\n {6}contents:\s*read\s*$/m);
  // The App token's inputs are `permission-*`, a different key; any other `<name>: write` would widen GITHUB_TOKEN.
  assert.ok(!/^[ \t]+(?!permission-)[a-z-]+:[ \t]*write[ \t]*$/m.test(text), "a permissions: block grants write");
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
  // `gh api` turns into a POST as soon as it is given a field, so fields and bodies are as forbidden as -X.
  assert.ok(!/\bgh pr\b|\bgit\b|--method|\s-X\s|\s-[fF]\s|--field|--raw-field|--input/.test(probe[0]), "the probe must not write");
});
