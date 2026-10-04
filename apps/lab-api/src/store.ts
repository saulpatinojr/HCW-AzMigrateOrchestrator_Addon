import { randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";
import type { Assessment } from "@amo/domain";
import type { Bundle } from "@amo/artifact-generator";

export interface StoredAssessment {
  id: string;
  ownerTokenHash: string;
  createdAt: number;
  expiresAt: number;
  assessment: Assessment;
  bundle: Bundle;
}

/**
 * In-memory, TTL-bound store. Uploads are never persisted to disk in the demo (ADR-0011).
 * Assessment IDs are unpredictable (UUIDv4) and every operation requires the owner token.
 */
export class AssessmentStore {
  private items = new Map<string, StoredAssessment>();
  constructor(private readonly ttlMs: number, private readonly maxItems = 200) {}

  put(assessment: Assessment, bundle: Bundle): { id: string; ownerToken: string; expiresAt: string } {
    this.sweep();
    if (this.items.size >= this.maxItems) {
      const oldest = [...this.items.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) this.items.delete(oldest.id);
    }
    const id = assessment.id || randomUUID();
    const ownerToken = randomBytes(24).toString("base64url");
    const now = Date.now();
    this.items.set(id, { id, ownerTokenHash: hash(ownerToken), createdAt: now, expiresAt: now + this.ttlMs, assessment, bundle });
    return { id, ownerToken, expiresAt: new Date(now + this.ttlMs).toISOString() };
  }

  get(id: string, ownerToken: string | undefined): StoredAssessment | null {
    this.sweep();
    const item = this.items.get(id);
    if (!item || !ownerToken) return null;
    const a = Buffer.from(item.ownerTokenHash);
    const b = Buffer.from(hash(ownerToken));
    return a.length === b.length && timingSafeEqual(a, b) ? item : null;
  }

  delete(id: string, ownerToken: string | undefined): boolean {
    const item = this.get(id, ownerToken);
    if (!item) return false;
    this.items.delete(id);
    return true;
  }

  /** One-time, short-lived token that lets a workspace fetch exactly one bundle once (ADR-0023). */
  private bundleTokens = new Map<string, { id: string; expiresAt: number }>();
  issueBundleToken(id: string, ownerToken: string | undefined, ttlMs = 10 * 60000): string | null {
    if (!this.get(id, ownerToken)) return null;
    const t = randomBytes(24).toString("base64url");
    this.bundleTokens.set(hash(t), { id, expiresAt: Date.now() + ttlMs });
    return t;
  }
  redeemBundleToken(id: string, token: string | undefined): StoredAssessment | null {
    if (!token) return null;
    const k = hash(token);
    const entry = this.bundleTokens.get(k);
    this.bundleTokens.delete(k); // single use, whether or not it matches
    if (!entry || entry.id !== id || entry.expiresAt <= Date.now()) return null;
    return this.items.get(id) ?? null;
  }

  sweep(now = Date.now()): number {
    for (const [k, v] of this.bundleTokens) if (v.expiresAt <= now) this.bundleTokens.delete(k);
    let n = 0;
    for (const [k, v] of this.items) if (v.expiresAt <= now) { this.items.delete(k); n++; }
    return n;
  }
  get size(): number { return this.items.size; }
}
const hash = (s: string): string => createHash("sha256").update(s).digest("hex");
