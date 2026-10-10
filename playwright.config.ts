import { defineConfig } from "@playwright/test";
/**
 * Lab e2e (npm run e2e): one lab API on 18080 serving the built pane (apps/lab-web/dist) with human verification configured
 * against a local siteverify mock (18090), and a host page on 18081 that frames the pane exactly as the site does.
 * The widget script itself is stubbed per test with page.route (tests/e2e/lab.spec.ts).
 */
const API_ENV = {
  PORT: "18080",
  AMO_LOG_SILENT: "1",
  AMO_STATIC_DIR: "apps/lab-web/dist",
  AMO_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET: "e2e-secret",
  AMO_TURNSTILE_SITEVERIFY_URL: "http://127.0.0.1:18090/siteverify",
  AMO_FRAME_ANCESTORS: "'self' http://127.0.0.1:18081",
  AMO_SITE_ORIGINS: "http://127.0.0.1:18081",
};
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:18080", trace: "retain-on-failure" },
  webServer: [
    { command: "node tests/e2e/siteverify-mock.mjs", url: "http://127.0.0.1:18090/siteverify", reuseExistingServer: !process.env.CI },
    { command: "node tests/e2e/host-server.mjs", url: "http://127.0.0.1:18081/", reuseExistingServer: !process.env.CI },
    // url (not port): the servers bind 127.0.0.1 explicitly; on Linux runners `localhost` resolves to ::1 and the IPv4 tests got ECONNREFUSED.
    { command: "node apps/lab-api/dist/server.js", url: "http://127.0.0.1:18080/api/health", reuseExistingServer: !process.env.CI, env: API_ENV },
  ],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
