import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// preserveSymlinks: during the interim contract @hybridcloudworks/migration-ui is a file: link into the sibling _App checkout (ADR-0028).
// The built pane (dist/) is served by the lab API from the same origin; in development the API runs on 18080 and /api is proxied to it.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { preserveSymlinks: true },
  build: { outDir: "dist", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 5175, strictPort: true, proxy: { "/api": "http://127.0.0.1:18080" } },
  preview: { host: "127.0.0.1", port: 5175, strictPort: true },
});
