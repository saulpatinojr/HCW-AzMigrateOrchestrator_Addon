import { loadRules, loadRulesFromContents, defaultRulesDir, type LoadedRules } from "@amo/evidence-engine";

/** Rules come from disk normally; inside a single-executable build they are embedded as the `rules.json` asset (ADR-0024). */
export async function loadRulesForCli(now = new Date()): Promise<{ rules: LoadedRules; source: string }> {
  try {
    const sea = await import("node:sea");
    if (sea.isSea()) {
      const map = JSON.parse(sea.getAsset("rules.json", "utf8")) as Record<string, string>;
      return { rules: loadRulesFromContents(Object.entries(map).map(([path, content]) => ({ path, content })), now), source: "embedded" };
    }
  } catch { /* node:sea unavailable or not a SEA build */ }
  const dir = defaultRulesDir();
  return { rules: loadRules(dir, now), source: dir };
}
