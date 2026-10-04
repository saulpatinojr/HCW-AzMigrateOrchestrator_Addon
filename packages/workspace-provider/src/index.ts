/** Workspace-provider abstraction (§24). The assessment engine never talks to Coder directly (ADR-0010). */
export interface WorkspaceRequest {
  assessmentId: string;
  ownerId: string;
  /** Files to attach, relative path → content. */
  artifacts: Record<string, string>;
  ttlMinutes: number;
}
export interface WorkspaceInfo {
  id: string;
  status: "pending" | "running" | "stopped" | "deleted" | "failed";
  launchUrl: string | null;
  expiresAt: string | null;
}
export interface WorkspaceProvider {
  readonly name: string;
  createWorkspace(req: WorkspaceRequest): Promise<WorkspaceInfo>;
  getWorkspaceStatus(id: string): Promise<WorkspaceInfo>;
  getWorkspaceLaunchUrl(id: string): Promise<string | null>;
  stopWorkspace(id: string): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  setWorkspaceExpiration(id: string, expiresAt: string): Promise<void>;
  attachAssessmentArtifacts(id: string, artifacts: Record<string, string>): Promise<void>;
}

/** Default when no Coder deployment is configured: features that need a workspace are disabled, not faked. */
export class DisabledWorkspaceProvider implements WorkspaceProvider {
  readonly name = "disabled";
  private fail(): never {
    throw new Error("workspace provider not configured (set CODER_URL and CODER_SESSION_TOKEN; see docs/deployment/coder.md)");
  }
  async createWorkspace(_req: WorkspaceRequest): Promise<WorkspaceInfo> { this.fail(); }
  async getWorkspaceStatus(): Promise<WorkspaceInfo> { this.fail(); }
  async getWorkspaceLaunchUrl(): Promise<string | null> { return null; }
  async stopWorkspace(): Promise<void> { this.fail(); }
  async deleteWorkspace(): Promise<void> { this.fail(); }
  async setWorkspaceExpiration(): Promise<void> { this.fail(); }
  async attachAssessmentArtifacts(): Promise<void> { this.fail(); }
}

/** In-memory provider for tests and local development. */
export class InMemoryWorkspaceProvider implements WorkspaceProvider {
  readonly name = "in-memory";
  private ws = new Map<string, WorkspaceInfo & { artifacts: Record<string, string> }>();
  async createWorkspace(req: WorkspaceRequest): Promise<WorkspaceInfo> {
    const id = `ws-${req.assessmentId.slice(0, 8)}`;
    const info = { id, status: "running" as const, launchUrl: `memory://${id}`, expiresAt: new Date(Date.now() + req.ttlMinutes * 60000).toISOString(), artifacts: { ...req.artifacts } };
    this.ws.set(id, info);
    return info;
  }
  async getWorkspaceStatus(id: string): Promise<WorkspaceInfo> { return this.ws.get(id) ?? { id, status: "deleted", launchUrl: null, expiresAt: null }; }
  async getWorkspaceLaunchUrl(id: string): Promise<string | null> { return this.ws.get(id)?.launchUrl ?? null; }
  async stopWorkspace(id: string): Promise<void> { const w = this.ws.get(id); if (w) w.status = "stopped"; }
  async deleteWorkspace(id: string): Promise<void> { this.ws.delete(id); }
  async setWorkspaceExpiration(id: string, expiresAt: string): Promise<void> { const w = this.ws.get(id); if (w) w.expiresAt = expiresAt; }
  async attachAssessmentArtifacts(id: string, artifacts: Record<string, string>): Promise<void> { const w = this.ws.get(id); if (w) Object.assign(w.artifacts, artifacts); }
}

/**
 * Coder provider over the Coder REST API (api/v2). Untested against a live deployment in this build
 * (VALIDATION.md). Uses a session token from the environment; never embeds credentials.
 */
export class CoderWorkspaceProvider implements WorkspaceProvider {
  readonly name = "coder";
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly templateId: string, private readonly fetchImpl: typeof fetch = fetch) {}
  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { "Coder-Session-Token": this.token, "content-type": "application/json", ...(init.headers ?? {}) } });
    if (!res.ok) throw new Error(`coder api ${path} -> ${res.status}`);
    return (await res.json()) as T;
  }
  async createWorkspace(req: WorkspaceRequest): Promise<WorkspaceInfo> {
    const ws = await this.api<{ id: string; latest_build: { status: string } }>(`/api/v2/users/me/workspaces`, { method: "POST", body: JSON.stringify({ name: `amo-${req.assessmentId.slice(0, 8)}`, template_id: this.templateId, ttl_ms: req.ttlMinutes * 60000, rich_parameter_values: [{ name: "assessment_id", value: req.assessmentId }, { name: "bundle_token", value: req.artifacts.bundleToken ?? "" }, { name: "api_base_url", value: req.artifacts.apiBaseUrl ?? "" }] }) });
    return { id: ws.id, status: "pending", launchUrl: `${this.baseUrl}/@me/amo-${req.assessmentId.slice(0, 8)}`, expiresAt: new Date(Date.now() + req.ttlMinutes * 60000).toISOString() };
  }
  async getWorkspaceStatus(id: string): Promise<WorkspaceInfo> {
    const ws = await this.api<{ id: string; latest_build: { status: string }; ttl_ms: number | null }>(`/api/v2/workspaces/${id}`);
    const map: Record<string, WorkspaceInfo["status"]> = { running: "running", stopped: "stopped", deleted: "deleted", failed: "failed" };
    return { id, status: map[ws.latest_build.status] ?? "pending", launchUrl: null, expiresAt: null };
  }
  async getWorkspaceLaunchUrl(id: string): Promise<string | null> { return `${this.baseUrl}/workspaces/${id}`; }
  async stopWorkspace(id: string): Promise<void> { await this.api(`/api/v2/workspaces/${id}/builds`, { method: "POST", body: JSON.stringify({ transition: "stop" }) }); }
  async deleteWorkspace(id: string): Promise<void> { await this.api(`/api/v2/workspaces/${id}/builds`, { method: "POST", body: JSON.stringify({ transition: "delete" }) }); }
  async setWorkspaceExpiration(id: string, expiresAt: string): Promise<void> { await this.api(`/api/v2/workspaces/${id}/ttl`, { method: "PUT", body: JSON.stringify({ ttl_ms: Math.max(0, new Date(expiresAt).getTime() - Date.now()) }) }); }
  async attachAssessmentArtifacts(): Promise<void> {
    // Artifacts reach the workspace through template parameters (assessment_id, bundle_token, api_base_url): the startup
    // script downloads the bundle once with the one-time token (ADR-0023). Direct file push is not part of the Coder API.
  }
}

export function workspaceProviderFromEnv(env: NodeJS.ProcessEnv = process.env): WorkspaceProvider {
  if (env.CODER_URL && env.CODER_SESSION_TOKEN && env.CODER_TEMPLATE_ID) return new CoderWorkspaceProvider(env.CODER_URL, env.CODER_SESSION_TOKEN, env.CODER_TEMPLATE_ID);
  if (env.AMO_WORKSPACE_PROVIDER === "memory") return new InMemoryWorkspaceProvider();
  return new DisabledWorkspaceProvider();
}
