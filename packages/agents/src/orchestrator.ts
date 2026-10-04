import { randomUUID } from "node:crypto";
import { APPLICATION_VERSION, defaultIntent, type Assessment, type Edition, type MigrationIntent, type NormalizedResource, type ProgressEvent } from "@amo/domain";
import { ingestResourcesCsv, type IngestOptions } from "@amo/csv-ingestion";
import { loadRules, defaultRulesDir, type LoadedRules } from "@amo/evidence-engine";
import { mapDependencies, sequence } from "@amo/dependency-graph";
import { profileFromIntent } from "@amo/landing-zone";
import { classifyResource, planWaves, summarize } from "@amo/classification-engine";
import { buildBundle, type Bundle } from "@amo/artifact-generator";
import { assertDemoCannotUseAzure, type DiscoveryProvider, type DiscoveryScope } from "@amo/azure-discovery";
import { noopLogger, type Logger } from "@amo/observability";
import { runSafetyChecks, hasCritical } from "./safety.js";

export interface OrchestratorOptions {
  edition: Edition;
  rulesDir?: string;
  rules?: LoadedRules;
  logger?: Logger;
  ttlMinutes?: number | null;
  now?: () => Date;
  onProgress?: (e: ProgressEvent) => void;
  ingest?: IngestOptions;
}

export interface AssessmentResult {
  assessment: Assessment;
  bundle: Bundle;
}

/** User-visible progress messages (§18) — never hidden reasoning. */
const MESSAGES: Record<string, string> = {
  intake: "Recording migration intent and labelling assumptions",
  "csv-discovery": "Normalizing resource inventory",
  discovery: "Discovering resources (read-only)",
  evidence: "Loading versioned migration rules",
  dependencies: "Mapping dependencies and sequencing",
  "landing-zone": "Preparing landing-zone profile",
  classification: "Matching resource types to migration rules and separating infrastructure and data paths",
  waves: "Grouping resources into preliminary waves",
  report: "Preparing reports, example Terraform, scripts and validation guidance",
  safety: "Running safety checks",
};

export class Orchestrator {
  private readonly log: Logger;
  constructor(private readonly opts: OrchestratorOptions) {
    this.log = opts.logger ?? noopLogger;
  }

  private progress(events: ProgressEvent[], agent: string, status: ProgressEvent["status"], message = MESSAGES[agent] ?? agent): void {
    const e: ProgressEvent = { at: (this.opts.now ?? (() => new Date()))().toISOString(), agent, message, status };
    events.push(e);
    this.opts.onProgress?.(e);
    this.log.info(message, { agent, status });
  }

  /** Demo / CSV path. */
  async assessCsv(csv: string, intentInput: Partial<MigrationIntent> = {}): Promise<AssessmentResult> {
    const events: ProgressEvent[] = [];
    this.progress(events, "csv-discovery", "started");
    const ingest = ingestResourcesCsv(csv, this.opts.ingest);
    if (ingest.errors.length) {
      this.progress(events, "csv-discovery", "failed", ingest.errors.join("; "));
      throw new IngestionError(ingest.errors, ingest.warnings);
    }
    this.progress(events, "csv-discovery", "completed", `Normalized ${ingest.resources.length} resources (${ingest.duplicateCount} duplicates skipped)`);
    return this.run(ingest.resources, ingest.inputHash, ingest.warnings, intentInput, false, events);
  }

  /** Enterprise path through a discovery provider. The demo edition is refused an authenticated provider. */
  async assessDiscovered(provider: DiscoveryProvider, scope: DiscoveryScope, intentInput: Partial<MigrationIntent> = {}): Promise<AssessmentResult> {
    assertDemoCannotUseAzure(provider, this.opts.edition);
    const events: ProgressEvent[] = [];
    this.progress(events, "discovery", "started");
    const result = await provider.discover(scope);
    this.progress(events, "discovery", "completed", `Discovered ${result.resources.length} resources via ${provider.name}`);
    const hash = result.resources.map((r) => r.key).sort().join("\n");
    const { createHash } = await import("node:crypto");
    return this.run(result.resources, createHash("sha256").update(hash).digest("hex"), [...result.partialVisibility, ...result.permissionGaps.map((g) => `permission gap: ${g}`)], intentInput, provider.authenticated, events);
  }

  private async run(resources: NormalizedResource[], inputHash: string, warnings: string[], intentInput: Partial<MigrationIntent>, authenticated: boolean, events: ProgressEvent[]): Promise<AssessmentResult> {
    const now = (this.opts.now ?? (() => new Date()))();
    const today = now.toISOString().slice(0, 10);
    this.progress(events, "intake", "started");
    const intent = defaultIntent(intentInput);
    this.progress(events, "intake", "completed", `Intent: ${intent.desiredOperation}; ${intent.assumedFields.length} questionnaire fields assumed`);

    this.progress(events, "evidence", "started");
    const rules = this.opts.rules ?? loadRules(this.opts.rulesDir ?? defaultRulesDir(), now);
    if (rules.issues.length || rules.duplicates.length || rules.conflicts.length) {
      this.progress(events, "evidence", "failed", "rule corpus invalid");
      throw new Error(`rule corpus invalid: ${[...rules.issues.map((i) => `${i.file}:${i.ruleId ?? ""} ${i.path} ${i.message}`), ...rules.duplicates, ...rules.conflicts].join("; ")}`);
    }
    this.progress(events, "evidence", "completed", `${rules.rules.length} rules, snapshot ${rules.snapshot.snapshotVersion}${rules.stale.length ? `; ${rules.stale.length} rules past review date` : ""}`);
    for (const s of rules.stale) warnings.push(`stale rule: ${s}`);

    this.progress(events, "dependencies", "started");
    const deps = mapDependencies(resources);
    const seq = sequence(resources, deps);
    this.progress(events, "dependencies", "completed");

    this.progress(events, "landing-zone", "started");
    const profile = profileFromIntent(intent);
    this.progress(events, "landing-zone", "completed", `${profile.label}`);

    this.progress(events, "classification", "started");
    const ctx = { edition: this.opts.edition, authenticated, intent, profile, rules, dependencies: deps, sequence: seq, today };
    const decisions = resources.map((r) => classifyResource(r, ctx));
    this.progress(events, "classification", "completed", `${decisions.length} decisions; ${decisions.filter((d) => d.disposition === "unknown-requires-validation").length} require validation`);

    this.progress(events, "waves", "started");
    const wavePlan = planWaves(decisions);
    this.progress(events, "waves", "completed");

    const ttl = this.opts.ttlMinutes === undefined ? (this.opts.edition === "demo" ? 120 : null) : this.opts.ttlMinutes;
    const assessment: Assessment = {
      id: randomUUID(),
      edition: this.opts.edition,
      createdAt: now.toISOString(),
      expiresAt: ttl ? new Date(now.getTime() + ttl * 60000).toISOString() : null,
      inputHash,
      rulesVersion: rules.snapshot.snapshotVersion,
      rulesChecksum: rules.snapshot.checksum,
      applicationVersion: APPLICATION_VERSION,
      authenticated,
      intent,
      summary: summarize(decisions, this.opts.edition, authenticated),
      decisions,
      wavePlan,
      ingestionWarnings: warnings,
      safetyFindings: [],
      progress: events,
    };
    this.progress(events, "report", "started");
    const bundle = buildBundle(assessment);
    this.progress(events, "report", "completed", `${Object.keys(bundle.files).length} files`);
    this.progress(events, "safety", "started");
    assessment.safetyFindings = runSafetyChecks(assessment, bundle.files);
    this.progress(events, "safety", hasCritical(assessment.safetyFindings) ? "failed" : "completed", assessment.safetyFindings.length ? `${assessment.safetyFindings.length} findings` : "no findings");
    if (hasCritical(assessment.safetyFindings)) throw new Error(`safety agent blocked the assessment: ${assessment.safetyFindings.filter((f) => f.startsWith("CRITICAL")).join("; ")}`);
    // Bundle manifest/README were built before safety ran; rebuild so evidence reflects the final state.
    return { assessment, bundle: buildBundle(assessment) };
  }
}

export class IngestionError extends Error {
  constructor(public readonly errors: string[], public readonly warnings: string[]) {
    super(errors.join("; "));
    this.name = "IngestionError";
  }
}
