import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDemoApi } from "./app.js";
import { defaultRulesDir } from "@hybridcloudworks/migration-core/evidence-engine";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const port = Number(process.env.PORT ?? 8080);
const { server } = createDemoApi({
  staticDir: process.env.AMO_STATIC_DIR ?? join(repoRoot, "apps", "lab-web", "public"),
  sampleCsvPath: join(repoRoot, "samples", "resources-csv", "sample-resources.csv"),
  ttlMinutes: Number(process.env.AMO_ASSESSMENT_TTL_MINUTES ?? 120),
  rulesDir: process.env.AMO_RULES_DIR ?? defaultRulesDir(),
  allowedOrigins: (process.env.AMO_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  turnstileSecret: process.env.TURNSTILE_SECRET || undefined,
  publicBaseUrl: process.env.AMO_PUBLIC_BASE_URL,
  telemetry: process.env.AMO_TELEMETRY === "1",
});
server.listen(port, () => process.stderr.write(`{"msg":"lab-api listening","port":${port},"edition":"demo"}\n`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
