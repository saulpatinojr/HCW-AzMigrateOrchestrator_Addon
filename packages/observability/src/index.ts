/**
 * Minimal structured logger with redaction. OpenTelemetry-compatible attribute naming;
 * exporters can be attached later without changing call sites (ADR-0014).
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const SECRET_PATTERNS: RegExp[] = [
  /AccountKey=[^;\s]+/gi,
  /SharedAccessSignature=[^;\s]+/gi,
  /sig=[A-Za-z0-9%+/=]{20,}/gi,
  /(password|pwd|secret|token)\s*[=:]\s*[^;\s,]+/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
];

export function redact(input: string): string {
  let out = input;
  for (const p of SECRET_PATTERNS) out = out.replace(p, (m) => m.split(/[=:]/)[0] + "=[REDACTED]");
  return out;
}

export interface LogRecord {
  ts: string;
  level: LogLevel;
  msg: string;
  attrs: Record<string, unknown>;
}

export interface Logger {
  log(level: LogLevel, msg: string, attrs?: Record<string, unknown>): void;
  info(msg: string, attrs?: Record<string, unknown>): void;
  warn(msg: string, attrs?: Record<string, unknown>): void;
  error(msg: string, attrs?: Record<string, unknown>): void;
  debug(msg: string, attrs?: Record<string, unknown>): void;
  child(attrs: Record<string, unknown>): Logger;
}

export function createLogger(base: Record<string, unknown> = {}, sink: (r: LogRecord) => void = defaultSink): Logger {
  const log = (level: LogLevel, msg: string, attrs: Record<string, unknown> = {}) => {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries({ ...base, ...attrs })) {
      // Never log raw CSV rows or payloads: only scalar, redacted values.
      safe[k] = typeof v === "string" ? redact(v) : typeof v === "object" && v !== null ? "[object]" : v;
    }
    sink({ ts: new Date().toISOString(), level, msg: redact(msg), attrs: safe });
  };
  return {
    log,
    info: (m, a) => log("info", m, a),
    warn: (m, a) => log("warn", m, a),
    error: (m, a) => log("error", m, a),
    debug: (m, a) => log("debug", m, a),
    child: (attrs) => createLogger({ ...base, ...attrs }, sink),
  };
}

function defaultSink(r: LogRecord): void {
  if (process.env.AMO_LOG_SILENT === "1") return;
  process.stderr.write(JSON.stringify(r) + "\n");
}

export const noopLogger: Logger = createLogger({}, () => {});
