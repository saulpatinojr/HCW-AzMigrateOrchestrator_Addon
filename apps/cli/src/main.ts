#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Orchestrator, IngestionError, AGENTS } from "@amo/agents";
import { defaultRulesDir, readSnapshot, compareSnapshots } from "@amo/evidence-engine";
import { loadRulesForCli } from "./rules-source.js";
import { writeBundle, createZip } from "@amo/artifact-generator";
import type { MigrationIntent } from "@amo/domain";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string): boolean => args.includes(`--${name}`);

function usage(): never {
  console.log(`amo — Azure Migration Orchestrator CLI

  amo assess --csv <file> --out <dir> [--region <azure-region>] [--operation region-relocation|resource-group-move|subscription-move|cross-tenant-migration]
             [--cross-tenant] [--different-subscription] [--rto-hours N] [--rpo-minutes N] [--downtime none|minutes|hours|days] [--zip] [--enterprise]
  amo rules validate            validate the rule corpus (exit 1 on issues/duplicates/conflicts)
  amo rules report              compare the corpus with rules/snapshots/current.json and print a change report
  amo rules snapshot            write rules/snapshots/current.json from the current corpus
  amo rules coverage            list resource types with rules and their support states (JSON)
  amo agents                    list agent definitions
`);
  process.exit(2);
}

async function main(): Promise<void> {
  const [cmd, sub] = args;
  if (cmd === "agents") {
    for (const a of AGENTS) console.log(`${a.id.padEnd(16)} ${a.name}${a.demo ? "" : "  (enterprise only)"}\n  ${a.purpose}`);
    return;
  }
  if (cmd === "rules") {
    const dir = defaultRulesDir();
    const { rules: loaded, source } = await loadRulesForCli();
    if (sub === "coverage") {
      const rows = [...loaded.byType.entries()].sort().map(([t, rs]) => { const r = rs.sort((a, b) => (b.precedence ?? 10) - (a.precedence ?? 10))[0]; return { resourceType: r.resourceType, ruleId: r.ruleId, version: r.ruleVersion, ...r.support, humanReview: r.humanReviewRequired, reviewDate: r.reviewDate }; });
      console.log(JSON.stringify({ source, snapshot: loaded.snapshot.snapshotVersion, count: rows.length, types: rows }, null, 2));
      return;
    }
    const snapPath = join(dir, "snapshots", "current.json");
    if (sub === "validate") {
      for (const i of loaded.issues) console.error(`ISSUE ${i.file} ${i.ruleId ?? ""} ${i.path}: ${i.message}`);
      for (const d of loaded.duplicates) console.error(`DUPLICATE ${d}`);
      for (const c of loaded.conflicts) console.error(`CONFLICT ${c}`);
      for (const s of loaded.stale) console.error(`STALE ${s}`);
      console.log(`${loaded.rules.length} rules; snapshot ${loaded.snapshot.snapshotVersion}; checksum ${loaded.snapshot.checksum}`);
      const stored = readSnapshot(snapPath);
      if (stored && stored.checksum !== loaded.snapshot.checksum) console.error(`CHECKSUM MISMATCH with ${snapPath}: run 'amo rules snapshot' after reviewing the change report`);
      process.exit(loaded.issues.length || loaded.duplicates.length || loaded.conflicts.length || (stored && stored.checksum !== loaded.snapshot.checksum) ? 1 : 0);
    }
    if (sub === "report") {
      const diff = compareSnapshots(readSnapshot(snapPath), loaded.snapshot);
      console.log(JSON.stringify({ ...diff, current: loaded.snapshot.snapshotVersion, checksum: loaded.snapshot.checksum, stale: loaded.stale }, null, 2));
      return;
    }
    if (sub === "snapshot") {
      if (loaded.issues.length || loaded.duplicates.length || loaded.conflicts.length) {
        console.error("refusing to snapshot an invalid corpus");
        process.exit(1);
      }
      mkdirSync(join(dir, "snapshots"), { recursive: true });
      writeFileSync(snapPath, JSON.stringify(loaded.snapshot, null, 2) + "\n");
      console.log(`wrote ${snapPath}`);
      return;
    }
    usage();
  }
  if (cmd === "assess") {
    const csvPath = flag("csv");
    const out = flag("out") ?? "./assessment-output";
    if (!csvPath || !existsSync(csvPath)) usage();
    const intent: Partial<MigrationIntent> = {
      destinationRegion: flag("region") ?? null,
      desiredOperation: (flag("operation") as MigrationIntent["desiredOperation"]) ?? (has("cross-tenant") ? "cross-tenant-migration" : "region-relocation"),
      sameTenant: has("cross-tenant") ? false : true,
      sameSubscription: has("different-subscription") || has("cross-tenant") ? false : true,
      rtoHours: flag("rto-hours") ? Number(flag("rto-hours")) : null,
      rpoMinutes: flag("rpo-minutes") ? Number(flag("rpo-minutes")) : null,
      downtimeTolerance: (flag("downtime") as MigrationIntent["downtimeTolerance"]) ?? null,
    };
    const edition = has("enterprise") ? "enterprise" : "demo";
    const { rules } = await loadRulesForCli();
    const o = new Orchestrator({ edition, rules, onProgress: (e) => process.stderr.write(`[${e.agent}] ${e.status}: ${e.message}\n`) });
    try {
      const { assessment, bundle } = await o.assessCsv(readFileSync(csvPath, "utf8"), intent);
      writeBundle(bundle, out);
      if (has("zip")) writeFileSync(join(out, "..", `assessment-${assessment.id.slice(0, 8)}.zip`), createZip(bundle.files));
      console.log(JSON.stringify({ assessmentId: assessment.id, out, resources: assessment.summary.resourceCount, dispositions: assessment.summary.dispositionTotals, unknown: assessment.summary.unknownCount, safetyFindings: assessment.safetyFindings }, null, 2));
    } catch (e) {
      if (e instanceof IngestionError) {
        console.error(`ingestion failed: ${e.errors.join("; ")}`);
        process.exit(1);
      }
      throw e;
    }
    return;
  }
  usage();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
