/**
 * Human-verification widget, owned entirely by the pane (contract decision 25): the script is injected at runtime only when
 * `/api/health.turnstile.required` is true, rendered explicitly with the published site key, and the token it yields is held
 * in memory and handed to the explorer's `getTurnstileToken`. Nothing here appears in visitor copy.
 */
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
}
export interface TurnstileApi {
  render(el: HTMLElement | string, opts: TurnstileRenderOptions): string;
  reset?(widgetId?: string): void;
  remove?(widgetId?: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<TurnstileApi> | null = null;

/** Loads the widget script once per page and resolves with its API. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("verification script loaded without its API")));
    s.onerror = () => { loading = null; reject(new Error("verification script failed to load")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** One widget: mounts into a container, keeps the latest token, re-renders when the token expires or the widget errors. */
export class TurnstileWidget {
  private token: string | undefined;
  private widgetId: string | undefined;
  private container: HTMLElement | undefined;
  private api: TurnstileApi | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly siteKey: string) {}

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.api = await loadTurnstile();
    if (this.container === container) this.render();
  }

  getToken = (): string | undefined => this.token;

  unmount(): void {
    if (this.retry) clearTimeout(this.retry);
    if (this.api && this.widgetId) this.api.remove?.(this.widgetId);
    this.widgetId = undefined;
    this.container = undefined;
    this.token = undefined;
  }

  private render(): void {
    if (!this.api || !this.container) return;
    if (this.widgetId) { this.api.remove?.(this.widgetId); this.widgetId = undefined; }
    this.container.replaceChildren();
    this.token = undefined;
    this.widgetId = this.api.render(this.container, {
      sitekey: this.siteKey,
      theme: "auto",
      callback: (t) => { this.token = t; },
      "expired-callback": () => this.rerender(),
      "error-callback": () => this.rerender(),
    });
  }

  private rerender(): void {
    this.token = undefined;
    if (this.retry) clearTimeout(this.retry);
    // A short delay keeps a persistently failing widget from re-rendering in a tight loop.
    this.retry = setTimeout(() => this.render(), 1000);
  }
}
