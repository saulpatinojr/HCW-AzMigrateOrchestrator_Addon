#!/usr/bin/env node
// Moves the two upstream tarball pins in package.json from one release tag to the next, and checks the lock that npm
// writes for them. .github/workflows/core-update.yml runs it in both of its jobs. The pull-request job, which later
// holds the GitHub App key, runs it from main's own checkout, so it must stay small and trusted: node: built-ins only
// (no dependency, nothing from node_modules), no network, and it reads or writes nothing but package.json and
// package-lock.json in the current directory.
//
//   node scripts/core-update-pin.mjs bump --from v0.4.0 --to v0.4.1   rewrites the two URLs in package.json
//   node scripts/core-update-pin.mjs check-lock --tag v0.4.1          checks package-lock.json against the pins
//
// A refusal prints a GitHub Actions `::error::` line and exits 1 without writing anything.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const UPSTREAM = "saulpatinojr/HCW-MigrateOrchestrator_App";
export const PACKAGES = ["migration-core", "migration-ui"];
// The only tag form the upstream release workflow publishes. Anything else (a `+`, a line break, a shell or sed
// metacharacter) is refused before it reaches a file.
const TAG = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
const SHA512 = /^sha512-[A-Za-z0-9+/]{86}==$/;
const REGISTRY = "https://registry.npmjs.org/";

export class PinError extends Error {}

function checkTag(tag, what) {
  if (typeof tag !== "string" || !TAG.test(tag)) throw new PinError(`${what} is not vMAJOR.MINOR.PATCH`);
}

export function tarballUrl(tag, pkg) {
  checkTag(tag, "the tag");
  if (!PACKAGES.includes(pkg)) throw new PinError(`unknown package ${pkg}`);
  return `https://github.com/${UPSTREAM}/releases/download/${tag}/hybridcloudworks-${pkg}-${tag.slice(1)}.tgz`;
}

const name = (pkg) => `@hybridcloudworks/${pkg}`;

// Returns package.json's text with both URLs moved from `from` to `to`. An exact string replacement (no sed, no
// regular expression built from the tag), and only when each old URL is the current value and appears exactly once.
// The result must parse and differ from the input in those two values only, so formatting and every other field stay.
export function bump(text, from, to) {
  checkTag(from, "the pinned tag");
  checkTag(to, "the new tag");
  if (from === to) throw new PinError("the new tag is the pinned tag");
  const before = JSON.parse(text);
  let out = text;
  const expected = structuredClone(before);
  for (const pkg of PACKAGES) {
    const oldUrl = tarballUrl(from, pkg);
    const newUrl = tarballUrl(to, pkg);
    if (before.dependencies?.[name(pkg)] !== oldUrl) {
      throw new PinError(`package.json does not pin ${name(pkg)} to the ${from} release tarball`);
    }
    const quoted = JSON.stringify(oldUrl);
    if (out.split(quoted).length !== 2) throw new PinError(`the ${from} URL of ${pkg} is not in package.json exactly once`);
    out = out.replace(quoted, () => JSON.stringify(newUrl));
    expected.dependencies[name(pkg)] = newUrl;
  }
  if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(expected)) {
    throw new PinError("the rewrite changed more than the two URLs");
  }
  return out;
}

// Problems with package-lock.json for the pins at `tag`; an empty list means it is acceptable. npm writes the lock
// with --allow-git=none and --allow-remote=root, so this is a second line: the two upstream entries carry the
// release URLs and a sha512 integrity, and every other downloaded package comes from the npm registry with one.
export function checkLock(lockText, pkgText, tag) {
  checkTag(tag, "the tag");
  const problems = [];
  const lock = JSON.parse(lockText);
  const pkg = JSON.parse(pkgText);
  if (lock.lockfileVersion !== 3) problems.push("package-lock.json is not lockfileVersion 3");
  const packages = lock.packages ?? {};
  const root = packages[""] ?? {};
  const upstream = new Map(PACKAGES.map((p) => [`node_modules/${name(p)}`, p]));
  for (const p of PACKAGES) {
    const url = tarballUrl(tag, p);
    if (pkg.dependencies?.[name(p)] !== url) problems.push(`package.json does not pin ${name(p)} to ${tag}`);
    if (root.dependencies?.[name(p)] !== url) problems.push(`the lock's root entry does not pin ${name(p)} to ${tag}`);
    const entry = packages[`node_modules/${name(p)}`];
    if (!entry) {
      problems.push(`the lock has no entry for ${name(p)}`);
      continue;
    }
    if (entry.resolved !== url) problems.push(`${name(p)} does not resolve to the ${tag} release tarball`);
    if (entry.version !== tag.slice(1)) problems.push(`${name(p)} is not version ${tag.slice(1)} in the lock`);
    if (!SHA512.test(entry.integrity ?? "")) problems.push(`${name(p)} has no sha512 integrity in the lock`);
  }
  // Workspace folders are listed as "apps/<name>" (the only workspace pattern, "apps/*") and linked into node_modules.
  const workspace = (key) => /^apps\/[A-Za-z0-9._-]+$/.test(key) && (pkg.workspaces ?? []).includes("apps/*");
  for (const [key, entry] of Object.entries(packages)) {
    if (key === "" || upstream.has(key)) continue;
    if (!key.includes("node_modules/")) {
      if (!workspace(key) || "resolved" in entry) problems.push(`unexpected lock entry ${key}`);
      continue;
    }
    if (entry.link) {
      if (!workspace(entry.resolved ?? "")) problems.push(`${key} links outside the workspaces`);
      continue;
    }
    if (entry.inBundle) continue; // shipped inside its parent's tarball, which carries the integrity
    if (!String(entry.resolved ?? "").startsWith(REGISTRY)) problems.push(`${key} does not come from the npm registry`);
    if (!SHA512.test(entry.integrity ?? "")) problems.push(`${key} has no sha512 integrity`);
  }
  return problems;
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!["--from", "--to", "--tag"].includes(argv[i]) || argv[i + 1] === undefined) throw new PinError(`bad argument ${argv[i]}`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

export function main(argv, dir = ".") {
  try {
    const [command, ...rest] = argv;
    const opts = args(rest);
    const pkgPath = `${dir}/package.json`;
    if (command === "bump") {
      const text = bump(readFileSync(pkgPath, "utf8"), opts.from, opts.to);
      writeFileSync(pkgPath, text);
      console.log(`package.json now pins ${opts.to}`);
      return 0;
    }
    if (command === "check-lock") {
      const problems = checkLock(readFileSync(`${dir}/package-lock.json`, "utf8"), readFileSync(pkgPath, "utf8"), opts.tag);
      for (const p of problems) console.log(`::error::${p}`);
      if (problems.length === 0) console.log(`package-lock.json pins ${opts.tag} and every package has a sha512 integrity`);
      return problems.length === 0 ? 0 : 1;
    }
    throw new PinError("usage: core-update-pin.mjs bump --from vX.Y.Z --to vX.Y.Z | check-lock --tag vX.Y.Z");
  } catch (err) {
    if (!(err instanceof PinError) && !(err instanceof SyntaxError)) throw err;
    console.log(`::error::${err.message}`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main(process.argv.slice(2));
