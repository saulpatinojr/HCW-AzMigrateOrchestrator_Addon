import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// core-update.yml opens its bump pull request with a GitHub App token, never with GITHUB_TOKEN. A pull request opened
// with GITHUB_TOKEN starts no workflow, so the required checks never run on it and it can never merge. The App's
// credential lives in the admin-ops environment, hence the environment on the job. These are static checks of the
// workflow text; they do not prove the credential works. A run with probe=true does (see the header of the workflow).

const text = readFileSync(".github/workflows/core-update.yml", "utf8").replace(/\r\n/g, "\n");
const steps = text.split("\njobs:\n")[1].split(/^ {6}- /m).slice(1); // the steps of the one job
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

test("the App token is for this repository only, with Contents and Pull requests write and nothing more", () => {
  const app = only("actions/create-github-app-token");
  assert.match(app, /client-id:\s*\$\{\{\s*vars\.APP_CLIENT_ID\s*\}\}/);
  assert.match(app, /private-key:\s*\$\{\{\s*secrets\.APP_PRIVATE_KEY\s*\}\}/);
  const granted = Object.fromEntries([...app.matchAll(/^\s*permission-([a-z-]+):\s*(\w+)\s*$/gm)].map((m) => [m[1], m[2]]));
  assert.deepEqual(granted, { contents: "write", "pull-requests": "write" });
  assert.ok(!/^\s*(owner|repositories):/m.test(app), "owner or repositories would widen the token beyond this repository");
});

test("the job runs in the admin-ops environment, which holds the App credential", () => {
  assert.match(text, /^ {4}environment:\s*admin-ops\s*$/m);
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

test("the probe step only reads", () => {
  const probe = steps.filter((s) => /^\s*if:\s*inputs\.probe\s*$/m.test(s));
  assert.equal(probe.length, 1, "expected exactly one probe step");
  assert.match(probe[0], /gh api "repos\/\$\{REPO\}"/);
  assert.ok(!/\bgh pr\b|\bgit\b|--method|\s-X\s/.test(probe[0]), "the probe must not write");
});
