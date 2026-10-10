import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, basename } from "node:path";
import { createRequire } from "node:module";
import { Orchestrator, IngestionError, AGENTS } from "@hybridcloudworks/migration-core/agents";
import { loadRules, defaultRulesDir } from "@hybridcloudworks/migration-core/evidence-engine";
import { API_LIMITS, parseCreateAssessmentRequest, type CreateAssessmentResponse } from "@hybridcloudworks/migration-core/contracts";
import { createZip } from "@hybridcloudworks/migration-core/artifact-generator";
import { demoPrincipal, gate } from "@hybridcloudworks/migration-core/authorization";
import { createLogger, type Logger } from "@hybridcloudworks/migration-core/observability";
import { AssessmentStore } from "./store.js";
import { workspaceProviderFromEnv, type WorkspaceProvider } from "@hybridcloudworks/migration-core/workspace-provider";

/** The catalogue id the website knows this AddOn by (`X-Addon-Id`, `/api/health.id`, the pane message `id`). */
export const ADDON_ID = "migration";
/** Version of the running edition: `apps/lab-api/package.json`, bumped with the repository release. */
export const ADDON_VERSION: string = (createRequire(import.meta.url)("../package.json") as { version: string }).version;
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const DEFAULT_SITEVERIFY_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`;
const SITEVERIFY_TIMEOUT_MS = 5000;

export interface RateLimitOptions {
  /** Anonymous mutating requests one client address may make per window (token bucket; refills continuously). */
  postsPerWindow: number;
  windowMs: number;
}

export interface DemoApiOptions {
  /** Exact origins allowed to call the API cross-origin. Empty = same-origin only (the pane is same-origin with its API). */
  allowedOrigins?: string[];
  /** Turnstile secret. When set, POST /api/assessments requires a valid x-turnstile-token. */
  turnstileSecret?: string;
  /** Public Turnstile site key, published by /api/health so the pane can render the widget. Required when the secret is set. */
  turnstileSiteKey?: string;
  /** Local development and e2e only: let anonymous uploads through without human verification. Otherwise fail closed (503). */
  allowNoTurnstile?: boolean;
  /** Override of the siteverify endpoint (e2e mock). */
  siteverifyUrl?: string;
  /** Upper bound on one siteverify call; past it the verdict is a failed `siteverify-timeout` (fail closed). Default 5000. */
  siteverifyTimeoutMs?: number;
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
  /** CSP `frame-ancestors` sources. Default `'none'`, which also sends `x-frame-options: DENY`. */
  frameAncestors?: string[];
  /** Site origins the pane may post `hcw-addon` messages to; published by /api/health. */
  siteOrigins?: string[];
  /** Trust the first `x-forwarded-for` value as the client address (only behind the host's reverse proxy). */
  trustProxy?: boolean;
  rateLimit?: RateLimitOptions;
  /** Assessments allowed to run at once; beyond it POST answers 503 with Retry-After. */
  maxConcurrent?: number;
  /** Override of the reported version (tests). */
  version?: string;
}

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".ico": "image/x-icon", ".png": "image/png", ".woff2": "font/woff2" };

export function createDemoApi(opts: DemoApiOptions = {}): { server: Server; store: AssessmentStore } {
  const log = opts.logger ?? createLogger({ app: "lab-api" });
  const ttl = (opts.ttlMinutes ?? API_LIMITS.assessmentTtlMinutes) * 60000;
  const store = new AssessmentStore(ttl);
  const orchestrator = new Orchestrator({ edition: "demo", logger: log, rulesDir: opts.rulesDir, ttlMinutes: ttl / 60000, ingest: { maxRows: API_LIMITS.maxRows, maxBytes: API_LIMITS.maxUploadBytes } });
  const workspaces = opts.workspaceProvider ?? workspaceProviderFromEnv();
  const stats = { since: new Date().toISOString(), assessments: 0, resources: 0, byType: new Map<string, number>(), byDisposition: new Map<string, number>(), ruleMisses: new Map<string, number>() };
  const rulesForCoverage = loadRules(opts.rulesDir ?? defaultRulesDir());
  const version = opts.version ?? ADDON_VERSION;
  const frameAncestors = opts.frameAncestors?.length ? opts.frameAncestors : ["'none'"];
  const siteOrigins = (opts.siteOrigins ?? []).map((o) => o.replace(/\/$/, ""));
  const siteKey = opts.turnstileSiteKey?.trim() || null;
  const turnstileRequired = Boolean(opts.turnstileSecret);
  const siteverifyUrl = opts.siteverifyUrl ?? DEFAULT_SITEVERIFY_URL;
  const siteverifyTimeoutMs = opts.siteverifyTimeoutMs ?? SITEVERIFY_TIMEOUT_MS;
  const rateLimit: RateLimitOptions = opts.rateLimit ?? { postsPerWindow: 10, windowMs: 10 * 60000 };
  const maxConcurrent = opts.maxConcurrent ?? 2;
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();
  let inFlight = 0;

  // Fail closed (contract decision 17/24): without a secret the anonymous upload route answers 503 unless explicitly allowed;
  // with a secret the pane needs the public site key, so a missing key is a configuration error, not a silent widget-less page.
  if (!turnstileRequired && !opts.allowNoTurnstile) log.warn("TURNSTILE_SECRET is not set: POST /api/assessments answers 503 turnstile_not_configured (set AMO_ALLOW_NO_TURNSTILE=1 for local development only)");
  if (!turnstileRequired && opts.allowNoTurnstile) log.warn("AMO_ALLOW_NO_TURNSTILE=1: uploads are accepted without human verification; local development and e2e only");
  // Unconditional: the bypass flag covers only the no-secret case. A secret without the public site key would enforce a
  // verification the pane can never pass, so the server refuses to start rather than serve a dead upload form.
  if (turnstileRequired && !siteKey) throw new Error("TURNSTILE_SECRET is set but AMO_TURNSTILE_SITE_KEY is empty: the pane could not render the widget, so no upload could ever pass verification. Set the site key published by the widget.");

  const securityHeaders = (): Record<string, string> => {
    const csp = [
      "default-src 'self'",
      siteKey ? `script-src 'self' ${TURNSTILE_ORIGIN}` : "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      ...(siteKey ? [`frame-src ${TURNSTILE_ORIGIN}`] : []),
      `frame-ancestors ${frameAncestors.join(" ")}`,
      "base-uri 'none'",
      "form-action 'self'",
    ].join("; ");
    const h: Record<string, string> = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()", "cross-origin-opener-policy": "same-origin", "cache-control": "no-store", "content-security-policy": csp, "x-addon-id": ADDON_ID, "x-addon-version": version };
    if (frameAncestors.length === 1 && frameAncestors[0] === "'none'") h["x-frame-options"] = "DENY";
    return h;
  };
  const sweeper = setInterval(() => { store.sweep(); sweepBuckets(buckets, rateLimit.windowMs); }, 60000);
  sweeper.unref();

  const json = (res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}): void => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...securityHeaders(), ...extra });
    res.end(JSON.stringify(body));
  };
  const error = (res: ServerResponse, status: number, code: string, message: string, details?: unknown, extra: Record<string, string> = {}): void => json(res, status, { error: { code, message, details } }, extra);
  /** Answers without reading the body and closes the connection once the answer has flushed, so an unread upload can neither be buffered nor hold the socket. */
  const refuse = (req: IncomingMessage, res: ServerResponse, status: number, code: string, message: string): void => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...securityHeaders(), connection: "close" });
    res.end(JSON.stringify({ error: { code, message } }), () => req.destroy());
  };

  const allowed = new Set((opts.allowedOrigins ?? []).map((o) => o.replace(/\/$/, "")));
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const origin = String(req.headers.origin ?? "");
    if (origin && allowed.has(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader("access-control-allow-headers", "content-type, x-owner-token, x-turnstile-token");
      res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("access-control-expose-headers", "content-disposition, retry-after, x-addon-id, x-addon-version");
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
      if (url.pathname === "/api/health") {
        const capabilities = ["assessments", ...(opts.sampleCsvPath ? ["sample-csv"] : []), "bundle-download", ...(workspaces.name !== "disabled" ? ["workspace"] : [])];
        return json(res, 200, { ok: true, id: ADDON_ID, version, edition: "demo", capabilities, asOf: new Date().toISOString(), siteOrigins, turnstile: { required: turnstileRequired, siteKey }, rulesLoaded: true, azureConnectivity: "disabled-by-design", workspace: workspaces.name });
      }
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
      // App-level rate limit on the anonymous mutating routes, keyed by client address (socket, or x-forwarded-for behind the proxy).
      const mutating = req.method === "POST" && (url.pathname === "/api/assessments" || /^\/api\/assessments\/[0-9a-f-]{36}\/workspace$/.test(url.pathname));
      if (mutating) {
        const wait = takeToken(buckets, clientAddress(req, opts.trustProxy) ?? "unknown", rateLimit);
        if (wait > 0) return error(res, 429, "rate_limited", "too many requests from this client; try again later", { retryAfterSeconds: wait }, { "retry-after": String(wait) });
      }
      if (url.pathname === "/api/assessments" && req.method === "POST") {
        // Fail closed before touching the body: the answer goes out at once and the connection is closed behind it.
        if (!turnstileRequired && !opts.allowNoTurnstile) return refuse(req, res, 503, "turnstile_not_configured", "human verification is not configured on this deployment");
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
        // The concurrency bound covers verification as well as the assessment: a slow or stalled verification endpoint
        // (itself capped by the siteverify timeout) can hold at most maxConcurrent requests, never every connection.
        if (inFlight >= maxConcurrent) return error(res, 503, "overloaded", "the lab is busy; try again in a few seconds", { retryAfterSeconds: 5 }, { "retry-after": "5" });
        const t0 = Date.now();
        inFlight++;
        let result: Awaited<ReturnType<typeof orchestrator.assessCsv>>;
        try {
          if (opts.turnstileSecret) {
            const tt = req.headers["x-turnstile-token"];
            const verdict = await verifyTurnstile(opts.turnstileSecret, Array.isArray(tt) ? tt[0] : tt, clientAddress(req, opts.trustProxy), fetchImpl, siteverifyUrl, siteverifyTimeoutMs);
            if (!verdict.ok) return error(res, 403, "turnstile_failed", "human verification failed", { codes: verdict.codes });
          }
          result = await orchestrator.assessCsv(parsed.value.csv, parsed.value.intent ?? {});
        } finally { inFlight--; }
        const { assessment, bundle } = result;
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
          if (req.method !== "POST") return error(res, 405, "method_not_allowed", "POST required");
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
      return serveStatic(opts.staticDir, url.pathname, res, securityHeaders);
    } catch (e) {
      if (e instanceof IngestionError) return error(res, 422, "ingestion_failed", e.errors.join("; "), { warnings: e.warnings });
      log.error("request failed", { reqId, message: (e as Error).message });
      return error(res, 500, "internal_error", "unexpected error (see server log, request " + reqId + ")");
    }
  });
  return { server, store };
}

/** Token bucket per client: returns 0 when a token was taken, else the seconds until the next one. */
function takeToken(buckets: Map<string, { tokens: number; updatedAt: number }>, key: string, limit: RateLimitOptions): number {
  const now = Date.now();
  const rate = limit.postsPerWindow / limit.windowMs; // tokens per ms
  const b = buckets.get(key) ?? { tokens: limit.postsPerWindow, updatedAt: now };
  b.tokens = Math.min(limit.postsPerWindow, b.tokens + (now - b.updatedAt) * rate);
  b.updatedAt = now;
  if (b.tokens >= 1) { b.tokens -= 1; buckets.set(key, b); return 0; }
  buckets.set(key, b);
  return Math.max(1, Math.ceil((1 - b.tokens) / rate / 1000));
}

function sweepBuckets(buckets: Map<string, { tokens: number; updatedAt: number }>, windowMs: number, now = Date.now()): void {
  for (const [k, b] of buckets) if (now - b.updatedAt > windowMs) buckets.delete(k);
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

function serveStatic(dir: string | undefined, pathname: string, res: ServerResponse, headers: () => Record<string, string>): void {
  if (!dir) { res.writeHead(404, headers()); return void res.end("not found"); }
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(dir, safe === "/" ? "index.html" : safe);
  if (!file.startsWith(dir)) { res.writeHead(403, headers()); return void res.end("forbidden"); }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, "index.html");
  if (!existsSync(file)) { res.writeHead(404, headers()); return void res.end("not found"); }
  // index.html (and the SPA fallback) revalidates on every load; Vite's hashed /assets are immutable; anything else is short-lived.
  const cache = basename(file) === "index.html" ? "no-cache" : safe.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300";
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", ...headers(), "cache-control": cache });
  res.end(readFileSync(file));
}

/** Client address: the socket peer, or the first x-forwarded-for value when the host's reverse proxy is trusted to set it. */
export function clientAddress(req: IncomingMessage, trustProxy = false): string | undefined {
  if (trustProxy) {
    const xff = req.headers["x-forwarded-for"];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return normalizeAddress(req.socket.remoteAddress);
}

/** An IPv4-mapped IPv6 socket address (`::ffff:127.0.0.1`, what a dual-stack listener reports) is keyed as its IPv4 form. */
function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return undefined;
  return address.toLowerCase().startsWith("::ffff:") ? address.slice(7) : address;
}

/**
 * Turnstile server-side verification (siteverify), bounded by `timeoutMs`: the call is aborted through its signal and raced
 * against the timer (so a fetch that ignores the signal still ends), and a timeout is a failed verdict, never a pass.
 */
export async function verifyTurnstile(secret: string, token: string | undefined, remoteip: string | undefined, fetchImpl: typeof fetch, siteverifyUrl = DEFAULT_SITEVERIFY_URL, timeoutMs = SITEVERIFY_TIMEOUT_MS): Promise<{ ok: boolean; codes: string[] }> {
  if (!token) return { ok: false, codes: ["missing-input-response"] };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const expiry = new Promise<never>((_, reject) => ctl.signal.addEventListener("abort", () => reject(new Error("siteverify-timeout")), { once: true }));
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const res = await Promise.race([fetchImpl(siteverifyUrl, { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" }, signal: ctl.signal }), expiry]);
    const data = (await Promise.race([res.json(), expiry])) as { success: boolean; "error-codes"?: string[] };
    return { ok: data.success === true, codes: data["error-codes"] ?? [] };
  } catch {
    return { ok: false, codes: [ctl.signal.aborted ? "siteverify-timeout" : "siteverify-unreachable"] };
  } finally {
    clearTimeout(timer);
    expiry.catch(() => {});
  }
}
