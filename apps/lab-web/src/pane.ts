/**
 * Pane protocol (HCW AddOn Integration Standard, section 8): the framed pane tells the site what it is doing with one message
 * shape, posted to each site origin the API was configured with (`/api/health.siteOrigins`), never to `*`. The site reads only
 * `type`, `id`, `state` and, when the catalogue row grants it, `navigate`; it sends nothing back.
 */
export const ADDON_ID = "migration";
export type PaneState = "loading" | "ready" | "working" | "unavailable";
export interface PaneMessage { type: "hcw-addon"; id: typeof ADDON_ID; state: PaneState; navigate?: string }

let targets: string[] = [];
let current: PaneState | null = null;
const pending: PaneMessage[] = [];

const framed = (): boolean => typeof window !== "undefined" && window.parent !== window;

function post(msg: PaneMessage): void {
  if (!framed()) return;
  if (targets.length === 0) { pending.push(msg); return; } // the origins arrive with /api/health; nothing is ever sent to "*"
  for (const origin of targets) window.parent.postMessage(msg, origin);
}

/** Called once health answers; flushes the messages queued before the site origins were known (the initial `loading`). */
export function setSiteOrigins(origins: string[]): void {
  targets = origins.map((o) => o.replace(/\/$/, "")).filter((o) => /^https?:\/\/[^/]+$/.test(o));
  const queued = pending.splice(0);
  for (const m of queued) post(m);
}

/** Reports a state transition. Re-renders never emit duplicates: a message goes out only when the state changes. */
export function reportPaneState(state: PaneState): void {
  if (current === state) return;
  current = state;
  post({ type: "hcw-addon", id: ADDON_ID, state });
}

/** Asks the site to navigate to one of its own paths (e.g. `/contact`); the frame itself never navigates the top window. */
export function requestNavigate(path: string): void {
  post({ type: "hcw-addon", id: ADDON_ID, state: current ?? "ready", navigate: path });
}

/** Test seam: the current state and the number of messages still waiting for the site origins. */
export function paneDebugState(): { state: PaneState | null; pending: number; targets: string[] } {
  return { state: current, pending: pending.length, targets: [...targets] };
}
