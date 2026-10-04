import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { validateRule, type MigrationRule, type RuleSnapshot, type ValidationIssue } from "@amo/domain";

export interface LoadedRules {
  rules: MigrationRule[];
  issues: Array<ValidationIssue & { file: string; ruleId?: string }>;
  duplicates: string[];
  conflicts: string[];
  stale: string[];
  snapshot: RuleSnapshot;
  byType: Map<string, MigrationRule[]>;
}

const canonical = (v: unknown): string => JSON.stringify(sortKeys(v));
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}
export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

export function listRuleFiles(rulesDir: string): string[] {
  const out: string[] = [];
  for (const sub of ["azure", "organization"]) {
    const dir = join(rulesDir, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (f.endsWith(".json")) out.push(join(dir, f));
  }
  return out;
}

/** Load, validate and snapshot the rule corpus from disk. Organizational overlays load last and win by precedence. */
export function loadRules(rulesDir: string, today: Date = new Date()): LoadedRules {
  return loadRulesFromContents(listRuleFiles(rulesDir).map((file) => ({ path: relative(rulesDir, file), content: readFileSync(file, "utf8") })), today);
}

/** Same as loadRules but from in-memory contents (single-executable CLI embeds the corpus as an asset; ADR-0024). */
export function loadRulesFromContents(inputs: Array<{ path: string; content: string }>, today: Date = new Date()): LoadedRules {
  const rules: MigrationRule[] = [];
  const issues: LoadedRules["issues"] = [];
  const files: RuleSnapshot["files"] = [];
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  const ordered = [...inputs].sort((a, b) => (a.path.startsWith("organization") ? 1 : 0) - (b.path.startsWith("organization") ? 1 : 0) || a.path.localeCompare(b.path));
  for (const { path: file, content: raw } of ordered) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      issues.push({ file, path: "", message: `invalid JSON: ${(e as Error).message}` });
      continue;
    }
    if (!Array.isArray(parsed)) {
      issues.push({ file, path: "", message: "rule file must contain an array of rules" });
      continue;
    }
    const ids: string[] = [];
    for (const r of parsed) {
      const v = validateRule(r);
      const rule = r as MigrationRule;
      for (const i of v) issues.push({ ...i, file, ruleId: rule.ruleId });
      if (v.length) continue;
      if (seen.has(rule.ruleId)) {
        duplicates.push(`${rule.ruleId} defined in ${seen.get(rule.ruleId)} and ${file}`);
        continue;
      }
      seen.set(rule.ruleId, file);
      if (file.startsWith("organization")) rule.precedence = rule.precedence ?? 100;
      else rule.precedence = rule.precedence ?? 10;
      rules.push(rule);
      ids.push(rule.ruleId);
    }
    files.push({ path: file, sha256: sha256(raw), ruleIds: ids });
  }
  const byType = new Map<string, MigrationRule[]>();
  for (const r of rules) {
    const k = r.resourceType.toLowerCase();
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k)!.push(r);
  }
  // conflict: same type + same precedence + different recommended disposition
  const conflicts: string[] = [];
  for (const [type, list] of byType) {
    const byPrec = new Map<number, MigrationRule[]>();
    for (const r of list) byPrec.set(r.precedence ?? 10, [...(byPrec.get(r.precedence ?? 10) ?? []), r]);
    for (const [prec, group] of byPrec) {
      const dispositions = new Set(group.map((g) => g.recommendedPattern.disposition));
      if (group.length > 1 && dispositions.size > 1) conflicts.push(`${type}: ${group.map((g) => g.ruleId).join(", ")} share precedence ${prec} but disagree (${[...dispositions].join(" vs ")})`);
    }
  }
  const stale = rules.filter((r) => new Date(r.reviewDate) < today).map((r) => `${r.ruleId} review date ${r.reviewDate} has passed`);
  const sorted = [...rules].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const snapshot: RuleSnapshot = {
    snapshotVersion: deriveSnapshotVersion(sorted),
    createdAt: today.toISOString(),
    ruleCount: sorted.length,
    checksum: sha256(canonical(sorted)),
    files,
  };
  return { rules, issues, duplicates, conflicts, stale, snapshot, byType };
}

function deriveSnapshotVersion(rules: MigrationRule[]): string {
  // highest major.minor of ruleVersion plus count — stable and human-readable
  const versions = rules.map((r) => r.ruleVersion.split(".").map(Number));
  const major = Math.max(0, ...versions.map((v) => v[0] || 0));
  const minor = Math.max(0, ...versions.map((v) => v[1] || 0));
  return `${major}.${minor}.${rules.length}`;
}

/**
 * Find the governing rule for a resource type. Exact type match first (highest precedence wins);
 * otherwise, for child types, fall back to the parent type and flag the fallback.
 */
export function findRule(loaded: LoadedRules, resourceType: string): { rule: MigrationRule | null; via: "exact" | "parent" | "none"; parentType?: string } {
  const key = resourceType.toLowerCase();
  const exact = loaded.byType.get(key);
  if (exact?.length) return { rule: [...exact].sort((a, b) => (b.precedence ?? 10) - (a.precedence ?? 10))[0], via: "exact" };
  const parts = key.split("/");
  if (parts.length > 2) {
    const parent = parts.slice(0, -1).join("/");
    const p = loaded.byType.get(parent);
    if (p?.length) return { rule: [...p].sort((a, b) => (b.precedence ?? 10) - (a.precedence ?? 10))[0], via: "parent", parentType: parent };
  }
  return { rule: null, via: "none" };
}

/** Compare a stored snapshot with a freshly computed one (rule-change report; §11). */
export function compareSnapshots(previous: RuleSnapshot | null, current: RuleSnapshot): { changed: boolean; added: string[]; removed: string[]; modifiedFiles: string[] } {
  if (!previous) return { changed: true, added: current.files.flatMap((f) => f.ruleIds), removed: [], modifiedFiles: current.files.map((f) => f.path) };
  const prevIds = new Set(previous.files.flatMap((f) => f.ruleIds));
  const curIds = new Set(current.files.flatMap((f) => f.ruleIds));
  const added = [...curIds].filter((i) => !prevIds.has(i));
  const removed = [...prevIds].filter((i) => !curIds.has(i));
  const prevHash = new Map(previous.files.map((f) => [f.path, f.sha256]));
  const modifiedFiles = current.files.filter((f) => prevHash.get(f.path) !== f.sha256).map((f) => f.path);
  return { changed: previous.checksum !== current.checksum, added, removed, modifiedFiles };
}

export function readSnapshot(path: string): RuleSnapshot | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as RuleSnapshot;
}

/** Resolve the rules directory from the repository root (works from any package's dist). */
export function defaultRulesDir(): string {
  const env = process.env.AMO_RULES_DIR;
  if (env) return env;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "rules", "azure"))) return join(dir, "rules");
    dir = join(dir, "..");
  }
  return join(process.cwd(), "rules");
}
export * from "./learn-matrix.js";
