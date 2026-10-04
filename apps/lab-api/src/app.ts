import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { Orchestrator, IngestionError, AGENTS } from "@hybridcloudworks/migration-core/agents";
import { loadRules, defaultRulesDir } from "@hybridcloudworks/migration-core/evidence-engine";
import { API_LIMITS, parseCreateAssessmentRequest, type CreateAssessmentResponse } from "@hybridcloudworks/migration-core/contracts";
import { createZip } from "@hybridcloudworks/migration-core/artifact-generator";
import { demoPrincipal, gate } from "@hybridcloudworks/migration-core/authorization";
import { createLogger, type Logger } from "@hybridcloudworks/migration-core/observability";
import { AssessmentStore } from "./store.js";
import { workspaceProviderFromEnv, type WorkspaceProvider } from "@hybridcloudworks/migration-core/workspace-provider";

export interface DemoApiOptions {
  /** Exact origins allowed to call the API cross-origin (the content site). Empty = same-origin only. */
  allowedOrigins?: string[];
  /** Cloudflare Turnstile secret. When set, POST /api/assessments requires a valid x-turnstile-token. */
  turnstileSecret?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  staticDir?: string;
  /** Workspace provider for the guided lab; defaults from env (disabled unless CODER_* set). */
  workspaceProvider?: WorkspaceProvider;
  /** Opt-in, anonymized aggregate counts (resource types, dispositions). Never names, IDs, tags or subscriptions (ADR-0024). */
  telemetry?: boolean;
  /** Public base URL of this API as the workspace will reach it (for bundle download). */
  publicBaseUrl?: string;
  sampleCsvPath?: string;
  ttlMinutes?: number;
  logger?: Logger;
  rulesDir?: string;
}

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

export function createDemoApi(opts: DemoApiOptions = {}): { server: Server; store: AssessmentStore } {
  const log = opts.logger ?? createLogger({ app: "lab-api" });
  const ttl = (opts.ttlMinutes ?? API_LIMITS.assessmentTtlMinutes) * 60000;
  const store = new AssessmentStore(ttl);
  const orchestrator = new Orchestrator({ edition: "demo", logger: log, rulesDir: opts.rulesDir, ttlMinutes: ttl / 60000, ingest: { maxRows: API_LIMITS.maxRows, maxBytes: API_LIMITS.maxUploadBytes } });
  const workspaces = opts.workspaceProvider ?? workspaceProviderFromEnv();
  const stats = { since: new Date().toISOString(), assessments: 0, resources: 0, byType: new Map<string, number>(), byDisposition: new Map<string, number>(), ruleMisses: new Map<string, number>() };
  const rulesForCoverage = loadRules(opts.rulesDir ?? defaultRulesDir());
  const sweeper = setInterval(() => store.sweep(), 60000);
  sweeper.unref();

  const json = (res: ServerResponse, status: number, body: unknown): void => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...securityHeaders() });
    res.end(JSON.stringify(body));
  };
  const error = (res: ServerResponse, status: number, code: string, message: string, details?: unknown): void => json(res, status, { error: { code, message, details } });

  const allowed = new Set((opts.allowedOrigins ?? []).map((o) => o.replace(/\/$/, "")));
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  if (!opts.turnstileSecret) log.warn("Turnstile verification disabled (no TURNSTILE_SECRET); acceptable for local development only");

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const origin = String(req.headers.origin ?? "");
    if (origin && allowed.has(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader("access-control-allow-headers", "content-type, x-owner-token, x-turnstile-token");
      res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("access-control-expose-headers", "content-disposition");
      res.setHeader("access-control-max-age", "600");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(origin && allowed.has(origin) ? 204 : 403, securityHeaders());
      return res.end();
    }
    const token = req.headers["x-owner-token"];
    const ownerToken = Array.isArray(token) ? token[0] : token;
    const reqId = Math.random().toString(36).slice(2, 10);
    try {
      if (url.pathname === "/api/health") return json(res, 200, { ok: true, edition: "demo", rulesLoaded: true, azureConnectivity: "disabled-by-design", workspace: workspaces.name });
      if (url.pathname === "/api/agents") return json(res, 200, AGENTS.filter((a) => a.demo).map(({ id, name, purpose }) => ({ id, name, purpose })));
      if (url.pathname === "/api/rules/coverage") {
        const types = [...rulesForCoverage.byType.entries()].sort().map(([, rs]) => { const r = [...rs].sort((a, b) => (b.precedence ?? 10) - (a.precedence ?? 10))[0]; return { resourceType: r.resourceType, ruleId: r.ruleId, version: r.ruleVersion, support: r.support, humanReview: r.humanReviewRequired, reviewDate: r.reviewDate, sources: r.documentationSources.map((d) => d.url) }; });
        return json(res, 200, { snapshot: rulesForCoverage.snapshot.snapshotVersion, checksum: rulesForCoverage.snapshot.checksum, count: types.length, types });
      }
      if (url.pathname === "/api/stats") {
        if (!opts.telemetry) return error(res, 404, "not_enabled", "telemetry is not enabled on this deployment");
        const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([k, n]) => ({ key: k, count: n }));
        return json(res, 200, { since: stats.since, assessments: stats.assessments, resources: stats.resources, topResourceTypes: top(stats.byType), dispositions: top(stats.byDisposition), typesWithoutRule: top(stats.ruleMisses), note: "Aggregate counts only. No names, IDs, tags, subscriptions or file contents are recorded." });
      }
      if (url.pathname === "/api/sample.csv" && opts.sampleCsvPath) {
        res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="sample-resources.csv"', ...securityHeaders() });
        return res.end(readFileSync(opts.sampleCsvPath));
      }
      if (url.pathname === "/api/assessments" && req.method === "POST") {
        const raw = await readBody(req, API_LIMITS.maxUploadBytes + 64 * 1024);
        if (raw === null) return error(res, 413, "too_large", `request exceeds ${API_LIMITS.maxUploadBytes} bytes`);
        let body: unknown;
        const ct = String(req.headers["content-type"] ?? "");
        if (ct.startsWith("text/csv")) body = { csv: raw.toString("utf8") };
        else {
          try { body = JSON.parse(raw.toString("utf8")); } catch { return error(res, 400, "invalid_json", "body must be JSON or text/csv"); }
        }
        const parsed = parseCreateAssessmentRequest(body);
        if (!parsed.ok) return json(res, 400, parsed.error);
        if (opts.turnstileSecret) {
          const tt = req.headers["x-turnstile-token"];
          const verdict = await verifyTurnstile(opts.turnstileSecret, Array.isArray(tt) ? tt[0] : tt, remoteIp(req), fetchImpl);
          if (!verdict.ok) return error(res, 403, "turnstile_failed", "human verification failed", { codes: verdict.codes });
        }
        const t0 = Date.now();
        const { assessment, bundle } = await orchestrator.assessCsv(parsed.value.csv, parsed.value.intent ?? {});
        const stored = store.put(assessment, bundle);
        if (opts.telemetry) {
          stats.assessments++;
          stats.resources += assessment.decisions.length;
          for (const d of assessment.decisions) {
            const t = d.resourceType.toLowerCase();
            stats.byType.set(t, (stats.byType.get(t) ?? 0) + 1);
            stats.byDisposition.set(d.disposition, (stats.byDisposition.get(d.disposition) ?? 0) + 1);
            if (!d.ruleId) stats.ruleMisses.set(t, (stats.ruleMisses.get(t) ?? 0) + 1);
          }
        }
        log.info("assessment created", { reqId, id: stored.id, resources: assessment.summary.resourceCount, ms: Date.now() - t0 });
        const out: CreateAssessmentResponse = { assessmentId: stored.id, ownerToken: stored.ownerToken, expiresAt: stored.expiresAt, summary: assessment.summary, progress: assessment.progress, ingestionWarnings: assessment.ingestionWarnings };
        return json(res, 201, out);
      }
      const m = url.pathname.match(/^\/api\/assessments\/([0-9a-f-]{36})(\/bundle\.zip|\/files\/(.+)|\/workspace)?$/);
      if (m) {
        const bt = req.headers["x-bundle-token"];
        const bundleToken = Array.isArray(bt) ? bt[0] : bt;
        const item = m[2] === "/bundle.zip" && bundleToken && !ownerToken ? store.redeemBundleToken(m[1], bundleToken) : store.get(m[1], ownerToken);
        if (!item) return error(res, 404, "not_found", "assessment not found, expired, or owner token missing/invalid");
        if (req.method === "DELETE") { store.delete(m[1], ownerToken); return json(res, 200, { deleted: true }); }
        if (m[2] === "/workspace") {
          if (req.method !== "POST") return error(res, 405, "method", "POST required");
          if (workspaces.name === "disabled") return error(res, 404, "not_configured", "guided lab workspaces are not enabled on this deployment");
          const token = store.issueBundleToken(m[1], ownerToken)!;
          const ws = await workspaces.createWorkspace({ assessmentId: m[1], ownerId: "lab", artifacts: { bundleToken: token, apiBaseUrl: opts.publicBaseUrl ?? "" }, ttlMinutes: 240 });
          log.info("workspace requested", { reqId, id: m[1], provider: workspaces.name, workspace: ws.id });
          return json(res, 202, { workspaceId: ws.id, status: ws.status, launchUrl: ws.launchUrl, expiresAt: ws.expiresAt });
        }
        if (m[2] === "/bundle.zip") {
          res.writeHead(200, { "content-type": "application/zip", "content-disposition": `attachment; filename="assessment-${m[1].slice(0, 8)}.zip"`, ...securityHeaders() });
          return res.end(createZip(item.bundle.files));
        }
        if (m[3]) {
          const f = decodeURIComponent(m[3]);
          const content = item.bundle.files[f];
          if (content === undefined) return error(res, 404, "not_found", "no such file in bundle");
          res.writeHead(200, { "content-type": MIME[extname(f)] ?? "text/plain; charset=utf-8", ...securityHeaders() });
          return res.end(content);
        }
        return json(res, 200, { assessment: item.assessment, files: Object.keys(item.bundle.files) });
      }
      if (url.pathname.startsWith("/api/execute")) {
        // The demo edition has no execution surface; prove it through the authorization gate.
        const decision = gate(demoPrincipal("demo"), "production-deploy", "any");
        return json(res, 403, { error: { code: "execution_disabled", message: decision.reason } });
      }
      if (url.pathname.startsWith("/api/")) return error(res, 404, "not_found", "unknown API route");
      return serveStatic(opts.staticDir, url.pathname, res);
    } catch (e) {
      if (e instanceof IngestionError) return error(res, 422, "ingestion_failed", e.errors.join("; "), { warnings: e.warnings });
      log.error("request failed", { reqId, message: (e as Error).message });
      return error(res, 500, "internal", "unexpected error (see server log, request " + reqId + ")");
    }
  });
  return { server, store };
}

function securityHeaders(): Record<string, string> {
  return { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store", "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'", "x-frame-options": "DENY" };
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) { req.destroy(); resolve(null); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function serveStatic(dir: string | undefined, pathname: string, res: ServerResponse): void {
  if (!dir) { res.writeHead(404, securityHeaders()); return void res.end("not found"); }
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(dir, safe === "/" ? "index.html" : safe);
  if (!file.startsWith(dir)) { res.writeHead(403, securityHeaders()); return void res.end("forbidden"); }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, "index.html");
  if (!existsSync(file)) { res.writeHead(404, securityHeaders()); return void res.end("not found"); }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", ...securityHeaders(), "cache-control": "public, max-age=300" });
  res.end(readFileSync(file));
}

function remoteIp(req: IncomingMessage): string | undefined {
  // Behind Cloudflare Tunnel the client IP is in cf-connecting-ip; never trust x-forwarded-for from the open internet.
  const cf = req.headers["cf-connecting-ip"];
  return Array.isArray(cf) ? cf[0] : cf ?? req.socket.remoteAddress ?? undefined;
}

/** Cloudflare Turnstile server-side verification (siteverify). */
export async function verifyTurnstile(secret: string, token: string | undefined, remoteip: string | undefined, fetchImpl: typeof fetch): Promise<{ ok: boolean; codes: string[] }> {
  if (!token) return { ok: false, codes: ["missing-input-response"] };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    return { ok: data.success === true, codes: data["error-codes"] ?? [] };
  } catch (e) {
    return { ok: false, codes: ["siteverify-unreachable"] };
  }
}
