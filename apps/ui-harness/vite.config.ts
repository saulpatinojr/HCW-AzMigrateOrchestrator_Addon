import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// preserveSymlinks: during the interim contract @hybridcloudworks/migration-ui is a file: link into the sibling _App checkout (ADR-0028).
export default defineConfig({ plugins: [react(), tailwindcss()], resolve: { preserveSymlinks: true }, server: { host: "127.0.0.1", port: 5175, strictPort: true }, preview: { host: "127.0.0.1", port: 5175, strictPort: true } });
