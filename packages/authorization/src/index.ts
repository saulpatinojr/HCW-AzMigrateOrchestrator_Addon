import type { Edition } from "@amo/domain";

/** Authorization levels (§13). Higher levels imply lower ones. */
export const AUTHORIZATION_LEVELS = ["sign-in", "discovery", "validation", "artifact-generation", "planning", "controlled-execution", "destructive-execution"] as const;
export type AuthorizationLevel = (typeof AUTHORIZATION_LEVELS)[number];

export const EDITION_MAX_LEVEL: Record<Edition, AuthorizationLevel> = {
  /** The demo is technically unable to exceed planning (§3 principle 11). */
  demo: "planning",
  enterprise: "destructive-execution",
};

export interface Principal {
  id: string;
  edition: Edition;
  /** Granted level for this session. The demo always receives 'planning'. */
  grantedLevel: AuthorizationLevel;
  /** Explicit human approvals recorded for this session, by operation key. */
  approvals: Set<string>;
}

export const APPROVAL_REQUIRED_OPERATIONS = ["role-assignment", "replication-enable", "production-deploy", "failover", "dns-change", "data-cutover", "source-delete", "destructive-change", "irreversible-operation"] as const;
export type ApprovalOperation = (typeof APPROVAL_REQUIRED_OPERATIONS)[number];

export function levelIndex(l: AuthorizationLevel): number {
  return AUTHORIZATION_LEVELS.indexOf(l);
}

export function isAllowed(p: Principal, required: AuthorizationLevel): boolean {
  const cap = EDITION_MAX_LEVEL[p.edition];
  return levelIndex(p.grantedLevel) >= levelIndex(required) && levelIndex(cap) >= levelIndex(required);
}

/** Human approval gate (§12.19). Returns a decision, never throws. */
export function gate(p: Principal, operation: ApprovalOperation, targetKey: string): { allowed: boolean; reason: string } {
  if (p.edition === "demo") return { allowed: false, reason: "demo edition cannot execute Azure operations" };
  const needed: AuthorizationLevel = operation === "source-delete" || operation === "destructive-change" || operation === "irreversible-operation" ? "destructive-execution" : "controlled-execution";
  if (!isAllowed(p, needed)) return { allowed: false, reason: `requires ${needed}; session has ${p.grantedLevel}` };
  if (!p.approvals.has(`${operation}:${targetKey}`)) return { allowed: false, reason: `explicit human approval for ${operation} on ${targetKey} not recorded` };
  return { allowed: true, reason: "approved" };
}

export function demoPrincipal(id: string): Principal {
  return { id, edition: "demo", grantedLevel: "planning", approvals: new Set() };
}
