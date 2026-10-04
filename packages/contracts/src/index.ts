import type { Assessment, MigrationIntent, ProgressEvent, ResourceDecisionRecord } from "@amo/domain";

/** API contracts shared by lab-api, appliance-api and web clients. Documented in docs/api/openapi.yaml. */

export interface CreateAssessmentRequest {
  /** Raw CSV text (resources.csv export). Max size enforced server-side. */
  csv: string;
  fileName?: string;
  intent?: Partial<MigrationIntent>;
}

export interface CreateAssessmentResponse {
  assessmentId: string;
  /** Opaque owner token; required for all later operations on this assessment (per-user isolation). */
  ownerToken: string;
  expiresAt: string | null;
  summary: Assessment["summary"];
  progress: ProgressEvent[];
  ingestionWarnings: string[];
}

export interface GetAssessmentResponse {
  assessment: Omit<Assessment, "decisions"> & { decisions: ResourceDecisionRecord[] };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export const API_LIMITS = {
  maxUploadBytes: 5 * 1024 * 1024,
  maxRows: 5000,
  assessmentTtlMinutes: 120,
} as const;

/** Validates an incoming request body without external schema libraries. */
export function parseCreateAssessmentRequest(body: unknown): { ok: true; value: CreateAssessmentRequest } | { ok: false; error: ApiError } {
  if (!body || typeof body !== "object") return { ok: false, error: { error: { code: "invalid_body", message: "JSON object required" } } };
  const b = body as Record<string, unknown>;
  if (typeof b.csv !== "string" || b.csv.length === 0) return { ok: false, error: { error: { code: "csv_required", message: "csv must be a non-empty string" } } };
  if (b.csv.length > API_LIMITS.maxUploadBytes) return { ok: false, error: { error: { code: "too_large", message: `csv exceeds ${API_LIMITS.maxUploadBytes} bytes` } } };
  if (b.fileName !== undefined && (typeof b.fileName !== "string" || !/^[\w .()-]{1,120}\.csv$/i.test(b.fileName))) return { ok: false, error: { error: { code: "invalid_filename", message: "fileName must be a plain .csv name" } } };
  if (b.intent !== undefined && (typeof b.intent !== "object" || b.intent === null)) return { ok: false, error: { error: { code: "invalid_intent", message: "intent must be an object" } } };
  const intent = (b.intent ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(intent)) {
    // `key` is blocked except as the suffix of a tag-key selector (e.g. `applicationGroupTagKey`), which names a tag, not a credential.
    if (/password|secret|token|(?<!tag)key|connectionstring|credential|certificate/i.test(k)) {
      return { ok: false, error: { error: { code: "prohibited_field", message: `intent must never contain credentials (${k})` } } };
    }
  }
  return { ok: true, value: { csv: b.csv, fileName: b.fileName as string | undefined, intent: intent as Partial<MigrationIntent> } };
}
