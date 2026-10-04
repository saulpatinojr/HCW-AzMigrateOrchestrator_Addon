import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter((f) => f && !f.startsWith("node_modules") && !/\.(png|jpg|zip|ico)$/.test(f));
const PATTERNS = [
  [/AccountKey=[A-Za-z0-9+/=]{40,}/, "storage account key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, "JWT"],
  [/ghp_[A-Za-z0-9]{36}/, "GitHub token"],
  [/sk-[A-Za-z0-9]{32,}/, "API key"],
  [/(client_secret|clientSecret|CLIENT_SECRET)\s*[:=]\s*["'][A-Za-z0-9~._-]{20,}["']/, "client secret literal"],
];

test("no credential-shaped strings are committed", () => {
  const hits = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const [rx, what] of PATTERNS) if (rx.test(text)) hits.push(`${f}: ${what}`);
  }
  assert.deepEqual(hits, []);
});

test(".gitignore excludes secrets, state and runtime data", () => {
  const gi = readFileSync(".gitignore", "utf8");
  for (const must of [".env", "*.tfstate", "*.tfvars", "data/", "node_modules/"]) assert.ok(gi.includes(must), `.gitignore missing ${must}`);
  const env = readFileSync(".env.example", "utf8");
  assert.ok(!/SECRET\s*=[ \t]*\S/.test(env), ".env.example must not define a secret value");
});
