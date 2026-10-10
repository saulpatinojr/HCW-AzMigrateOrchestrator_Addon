import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { reportPaneState, requestNavigate, setSiteOrigins } from "./pane.js";
import { TurnstileWidget } from "./turnstile.js";

/** The one sentence shared by the site page, this pane and the host's 503 body (contract decision 12). */
export const UNAVAILABLE_SENTENCE = "This tool isn't available right now.";
/** Site path handed to the host for the enterprise CTA; a literal chosen here, never read from the API. */
const CONTACT_PATH = "/contact";

interface Health { ok: boolean; id: string; version: string; siteOrigins?: string[]; turnstile?: { required: boolean; siteKey: string | null } }

// Same pattern the site uses for client-only islands: lazy, so nothing from the UI package runs at module evaluation.
const MigrationExplorer = lazy(() => import("@hybridcloudworks/migration-ui").then((m) => ({ default: m.MigrationExplorer })));

/** Mounted beside the explorer inside the same Suspense boundary: its effect runs once the explorer is on screen. */
function Mounted() {
  useEffect(() => { reportPaneState("ready"); }, []);
  return null;
}

function TurnstileSlot({ widget }: { widget: TurnstileWidget }) {
  const ref = useCallback((el: HTMLDivElement | null) => { if (el) void widget.mount(el); else widget.unmount(); }, [widget]);
  return <div ref={ref} className="min-h-16" aria-label="Human verification" />;
}

export function PaneApp() {
  const [health, setHealth] = useState<Health | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const widget = useRef<TurnstileWidget | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Interim until the UI package confirms deletion without a modal: the site's sandbox has no `allow-modals`, so the
    // browser answers the explorer's `confirm()` with false and "Delete my data now" would do nothing. Framed, the question
    // is skipped and the delete proceeds (the data is the visitor's own upload). Recorded in VALIDATION.md.
    if (window.parent !== window) window.confirm = () => true;
    reportPaneState("loading");
    fetch("/api/health", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as Health; })
      .then((h) => {
        if (cancelled) return;
        if (!h.ok || h.id !== "migration") throw new Error("unexpected health");
        setSiteOrigins(h.siteOrigins ?? []);
        if (h.turnstile?.required && h.turnstile.siteKey) widget.current = new TurnstileWidget(h.turnstile.siteKey);
        setHealth(h);
      })
      .catch(() => { if (!cancelled) { setUnavailable(true); reportPaneState("unavailable"); } });
    return () => { cancelled = true; };
  }, []);

  // Every POST the explorer makes is the assessment (or a workspace request) running: `working` while it is in flight, `ready` after.
  const fetchImpl = useMemo<typeof fetch>(() => async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const working = method === "POST" && url.includes("/api/assessments");
    if (working) reportPaneState("working");
    try { return await fetch(input, init); } finally { if (working) reportPaneState("ready"); }
  }, []);

  // Interim until the UI package's `onNavigate` prop (APP_REF v0.3.0): the enterprise CTA is an in-frame link the site would
  // block, so the click is turned into a `navigate` request to the host instead.
  const onClickCapture = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest?.(`a[href="${CONTACT_PATH}"]`);
    if (a) { e.preventDefault(); requestNavigate(CONTACT_PATH); }
  }, []);

  if (unavailable) {
    return (
      <main className="mx-auto max-w-3xl p-6" role="status">
        <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 text-sm">{UNAVAILABLE_SENTENCE}</p>
      </main>
    );
  }
  if (!health) {
    return (
      <main className="mx-auto max-w-5xl p-6" role="status" aria-live="polite">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading the assessment…</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" data-addon="migration" data-addon-version={health.version} onClickCapture={onClickCapture}>
      <p className="mb-4 text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Azure migration assessment · not production</p>
      <Suspense fallback={<p role="status" aria-live="polite" className="text-sm text-[hsl(var(--muted-foreground))]">Loading the assessment…</p>}>
        <MigrationExplorer
          apiBaseUrl=""
          contactUrl={CONTACT_PATH}
          fetchImpl={fetchImpl}
          turnstile={widget.current ? <TurnstileSlot widget={widget.current} /> : undefined}
          getTurnstileToken={widget.current ? widget.current.getToken : undefined}
        />
        <Mounted />
      </Suspense>
    </main>
  );
}
