# Integrating the explorer into hybridcloudworks.com

The site (React 19 / Vite / Tailwind 4 / React Router / SWA behind Cloudflare) mounts `@hybridcloudworks/migration-ui` as a **client-only island**.

## 1. Dependency

The explorer is the published package `@hybridcloudworks/migration-ui`, released from the upstream product repository
`saulpatinojr/HCW-AzMigrateOrchestrator_App` (ADR-0028). Install it at an exact version:

```bash
npm install --save-exact @hybridcloudworks/migration-ui@0.2.0 --workspace=frontend
```

Peer deps `react`/`react-dom` are already present. Add the package to the Tailwind source scan in the site's CSS entry:

```css
@source "../node_modules/@hybridcloudworks/migration-ui/dist";
```

Until the owner completes the npm bootstrap (`docs/release/npm-publishing.md` upstream) the package is not on the registry and
the site cannot install it; a git dependency cannot deliver the assembled package, so Phase 3 of the working plan waits on that step.
Never install from `main` and do not use a submodule.

## 2. Routes (`frontend/src/App.jsx` + the route inventory)

| Route | Component |
|---|---|
| `/education/migration-labs` | static page: what the labs are, CTA to the assessment lab |
| `/education/migration-labs/azure-resource-assessment` | explainer + disclaimer + sample download + Start |
| `/education/migration-labs/azure-resource-assessment/start` | `<MigrationExplorerRoute />` (below) |

Add all three to `App.jsx` **and** the route inventory in the same PR, then run `npm run validate:routes && npm run validate:providers && npm run validate:content-matrix`.

## 3. Route component (prerender-safe)

```jsx
import { lazy, Suspense, useRef, useEffect } from "react";
const MigrationExplorer = lazy(() => import("@hybridcloudworks/migration-ui").then((m) => ({ default: m.MigrationExplorer })));

export default function MigrationExplorerRoute() {
  const tokenRef = useRef();
  useEffect(() => {
    // Turnstile script is owned by the site; render into #amo-turnstile and capture the token.
    window.turnstile?.render("#amo-turnstile", { sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, callback: (t) => (tokenRef.current = t) });
  }, []);
  return (
    <Suspense fallback={<p>Loading the explorer…</p>}>
      <MigrationExplorer
        apiBaseUrl={import.meta.env.VITE_LABS_API_URL}
        turnstile={<div id="amo-turnstile" />}
        getTurnstileToken={() => tokenRef.current}
        contactUrl="/contact"
      />
    </Suspense>
  );
}
```

`React.lazy` keeps the explorer out of the prerendered HTML and out of module evaluation, so `scripts/prerender.mjs` is
unaffected. `VITE_LABS_API_URL` (`https://labs-api.hybridcloudworks.com`) and `VITE_TURNSTILE_SITE_KEY` are public values and
belong in `VITE_*` by the site's own rule.

## 3b. Tailwind

The site's Tailwind 4 entry CSS must scan the UI package so its utility classes are generated:

```css
@import "tailwindcss";
@source "../node_modules/@hybridcloudworks/migration-ui/dist";
```

`apps/ui-harness` shows the exact setup (`src/styles.css`, `vite.config.ts`) and is what the Playwright e2e drives.

## 4. Lab API side

`AMO_ALLOWED_ORIGINS=https://hybridcloudworks.com,https://www.hybridcloudworks.com` and `TURNSTILE_SECRET` on the VPS. CORS
is exact-origin; the owner token is returned in the JSON body and held in component state only.

## 5. Content matrix and docs

Add the lab to the content matrix with owner, review cadence and the disclaimer text from `MigrationExplorer`. Narrative
docs for the lab live in this repository (`docs/demo/*`); the site links to them.

## 6. Checks before merge on the site

`npm run code:quality`, `npm run build` (prerender must not touch the island), `npm run test:e2e` smoke on the three routes,
and the staticwebapp config review: the explorer routes are public; no rewrite may expose admin routes.
