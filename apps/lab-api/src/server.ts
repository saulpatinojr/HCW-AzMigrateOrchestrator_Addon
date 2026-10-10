import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDemoApi, ADDON_ID, ADDON_VERSION } from "./app.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const port = Number(process.env.PORT ?? 8080);
const list = (v: string | undefined, sep: RegExp): string[] => (v ?? "").split(sep).map((s) => s.trim()).filter(Boolean);
const num = (v: string | undefined, dflt: number): number => { const n = Number(v); return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? n : dflt; };

const { server } = createDemoApi({
  staticDir: process.env.AMO_STATIC_DIR ?? join(repoRoot, "apps", "lab-web", "dist"),
  sampleCsvPath: join(repoRoot, "samples", "resources-csv", "sample-resources.csv"),
  ttlMinutes: num(process.env.AMO_ASSESSMENT_TTL_MINUTES, 120),
  allowedOrigins: list(process.env.AMO_ALLOWED_ORIGINS, /[,\s]+/),
  turnstileSecret: process.env.TURNSTILE_SECRET || undefined,
  turnstileSiteKey: process.env.AMO_TURNSTILE_SITE_KEY || undefined,
  allowNoTurnstile: process.env.AMO_ALLOW_NO_TURNSTILE === "1",
  siteverifyUrl: process.env.AMO_TURNSTILE_SITEVERIFY_URL || undefined,
  publicBaseUrl: process.env.AMO_PUBLIC_BASE_URL,
  telemetry: process.env.AMO_TELEMETRY === "1",
  // Pane contract (docs/website-integration/integration-guide.md): space-separated lists, as the host's Caddy config writes them.
  frameAncestors: list(process.env.AMO_FRAME_ANCESTORS, /\s+/),
  siteOrigins: list(process.env.AMO_SITE_ORIGINS, /\s+/),
  trustProxy: process.env.AMO_TRUST_PROXY === "1",
  rateLimit: { postsPerWindow: num(process.env.AMO_RATE_LIMIT_POSTS, 10), windowMs: num(process.env.AMO_RATE_LIMIT_WINDOW_MINUTES, 10) * 60000 },
  maxConcurrent: num(process.env.AMO_MAX_CONCURRENT, 2),
});
server.listen(port, () => process.stderr.write(`{"msg":"lab-api listening","port":${port},"edition":"demo","id":"${ADDON_ID}","version":"${ADDON_VERSION}"}\n`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
