import { join } from "node:path";
import type { DemoApiOptions } from "./app.js";

/** A space- or comma-separated list from the environment, as the host's Caddy configuration writes them. */
const list = (v: string | undefined, sep: RegExp): string[] => (v ?? "").split(sep).map((s) => s.trim()).filter(Boolean);

/** A strictly positive integer, or the default when unset; anything else refuses the start with the variable named. */
export function positiveInt(env: NodeJS.ProcessEnv, name: string, dflt: number): number {
  const v = env[name];
  if (v === undefined || v.trim() === "") return dflt;
  if (!/^\d+$/.test(v.trim()) || Number(v) < 1) throw new Error(`${name} must be a positive integer (got ${JSON.stringify(v)}); the default is ${dflt}`);
  return Number(v);
}

/** Builds the API options from the environment. Throws, with a clear message, on any value that would weaken a bound. */
export function optionsFromEnv(env: NodeJS.ProcessEnv, repoRoot: string): DemoApiOptions {
  return {
    staticDir: env.AMO_STATIC_DIR ?? join(repoRoot, "apps", "lab-web", "dist"),
    sampleCsvPath: join(repoRoot, "samples", "resources-csv", "sample-resources.csv"),
    ttlMinutes: positiveInt(env, "AMO_ASSESSMENT_TTL_MINUTES", 120),
    allowedOrigins: list(env.AMO_ALLOWED_ORIGINS, /[,\s]+/),
    turnstileSecret: env.TURNSTILE_SECRET || undefined,
    turnstileSiteKey: env.AMO_TURNSTILE_SITE_KEY || undefined,
    allowNoTurnstile: env.AMO_ALLOW_NO_TURNSTILE === "1",
    siteverifyUrl: env.AMO_TURNSTILE_SITEVERIFY_URL || undefined,
    publicBaseUrl: env.AMO_PUBLIC_BASE_URL,
    telemetry: env.AMO_TELEMETRY === "1",
    // Pane contract (docs/website-integration/integration-guide.md): space-separated lists.
    frameAncestors: list(env.AMO_FRAME_ANCESTORS, /\s+/),
    siteOrigins: list(env.AMO_SITE_ORIGINS, /\s+/),
    trustProxy: env.AMO_TRUST_PROXY === "1",
    // Abuse bounds: zero or garbage would disable a limit, so only positive integers are accepted (maxConcurrent >= 1).
    rateLimit: { postsPerWindow: positiveInt(env, "AMO_RATE_LIMIT_POSTS", 10), windowMs: positiveInt(env, "AMO_RATE_LIMIT_WINDOW_MINUTES", 10) * 60000 },
    maxConcurrent: positiveInt(env, "AMO_MAX_CONCURRENT", 2),
  };
}
