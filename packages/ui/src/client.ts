import type { CreateAssessmentRequest, CreateAssessmentResponse, GetAssessmentResponse, ApiError } from "@amo/contracts";

export interface LabApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class LabApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError | null) {
    super(body?.error.message ?? `HTTP ${status}`);
  }
}

/** Browser client for the lab API. The owner token lives only in this instance (component state), never in storage. */
export class LabApiClient {
  private ownerToken: string | null = null;
  private assessmentId: string | null = null;
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly opts: LabApiClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  }
  get id(): string | null { return this.assessmentId; }

  private async call<T>(path: string, init: RequestInit = {}, raw = false): Promise<T> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    if (this.ownerToken) headers["x-owner-token"] = this.ownerToken;
    const res = await this.fetchImpl(`${this.opts.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
    if (!res.ok) {
      let body: ApiError | null = null;
      try { body = (await res.json()) as ApiError; } catch { /* non-JSON error */ }
      throw new LabApiError(res.status, body);
    }
    return (raw ? res : await res.json()) as T;
  }

  async create(req: CreateAssessmentRequest, turnstileToken?: string): Promise<CreateAssessmentResponse> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (turnstileToken) headers["x-turnstile-token"] = turnstileToken;
    const out = await this.call<CreateAssessmentResponse>("/api/assessments", { method: "POST", headers, body: JSON.stringify(req) });
    this.ownerToken = out.ownerToken;
    this.assessmentId = out.assessmentId;
    return out;
  }
  async get(): Promise<GetAssessmentResponse & { files: string[] }> {
    return this.call(`/api/assessments/${this.assessmentId}`);
  }
  async file(path: string): Promise<string> {
    const res = await this.call<Response>(`/api/assessments/${this.assessmentId}/files/${encodeURIComponent(path)}`, {}, true);
    return res.text();
  }
  async bundle(): Promise<Blob> {
    const res = await this.call<Response>(`/api/assessments/${this.assessmentId}/bundle.zip`, {}, true);
    return res.blob();
  }
  async health(): Promise<{ ok: boolean; workspace?: string }> {
    return this.call("/api/health");
  }
  async openWorkspace(): Promise<{ workspaceId: string; status: string; launchUrl: string | null; expiresAt: string | null }> {
    return this.call(`/api/assessments/${this.assessmentId}/workspace`, { method: "POST" });
  }
  async delete(): Promise<void> {
    await this.call(`/api/assessments/${this.assessmentId}`, { method: "DELETE" });
    this.ownerToken = null;
    this.assessmentId = null;
  }
}
