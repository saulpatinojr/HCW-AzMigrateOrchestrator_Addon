import "./styles.css";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
// Same pattern the content site uses: a lazy, client-only island (prerender-safe).
const MigrationExplorer = lazy(() => import("@hybridcloudworks/migration-ui").then((m) => ({ default: m.MigrationExplorer })));
const apiBaseUrl = (import.meta.env.VITE_LABS_API_URL as string | undefined) ?? "http://127.0.0.1:18080";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1 className="mb-6 text-2xl font-semibold">Azure Resource Assessment (harness)</h1>
    <Suspense fallback={<p>Loading the explorer…</p>}>
      <MigrationExplorer apiBaseUrl={apiBaseUrl} />
    </Suspense>
  </StrictMode>,
);
