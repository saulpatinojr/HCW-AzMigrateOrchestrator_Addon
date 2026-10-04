import { defineConfig } from "@playwright/test";
/** Lab e2e: real lab-api (port 18080, CORS for the harness origin) + the ui-harness (port 5175). Run: npm run e2e */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:5175", trace: "retain-on-failure" },
  webServer: [
    { command: "PORT=18080 AMO_LOG_SILENT=1 AMO_ALLOWED_ORIGINS=http://127.0.0.1:5175,http://localhost:5175 node apps/lab-api/dist/server.js", port: 18080, reuseExistingServer: !process.env.CI },
    // url (not port): the harness binds 127.0.0.1 explicitly; on Linux runners `localhost` resolves to ::1 and the IPv4 tests got ECONNREFUSED.
    { command: "cd apps/ui-harness && npx vite build && npx vite preview", url: "http://127.0.0.1:5175", reuseExistingServer: !process.env.CI, stdout: "pipe", env: { VITE_LABS_API_URL: "http://127.0.0.1:18080" } },
  ],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
