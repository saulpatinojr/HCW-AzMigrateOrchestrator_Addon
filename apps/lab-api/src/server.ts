import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDemoApi, ADDON_ID, ADDON_VERSION } from "./app.js";
import { optionsFromEnv } from "./config.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const port = Number(process.env.PORT ?? 8080);

let server;
try {
  ({ server } = createDemoApi(optionsFromEnv(process.env, repoRoot)));
} catch (e) {
  // A configuration that would weaken a bound or leave verification unpassable refuses to start, with the variable named.
  process.stderr.write(`${JSON.stringify({ msg: "lab-api refusing to start", error: (e as Error).message })}\n`);
  process.exit(1);
}
server.listen(port, () => process.stderr.write(`{"msg":"lab-api listening","port":${port},"edition":"demo","id":"${ADDON_ID}","version":"${ADDON_VERSION}"}\n`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
