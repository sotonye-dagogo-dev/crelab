export const AUDIT_VALUE_MAX_LENGTH = 160;

/**
 * Renders an audit `oldValue`/`newValue` as a stable, human-readable string.
 * Objects and arrays are pretty-printed so nested changes stay readable; plain
 * scalars are stringified directly. `null`/`undefined` render as an empty
 * string so the UI can fall back to its own "no value" marker.
 */
export function serializeAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export interface AuditValueSummary {
  /** Collapsed, single-line preview used inside a table cell. */
  summary: string;
  /** Full serialized value (shown when expanded). */
  full: string;
  /** True when `full` was longer than the collapse threshold. */
  truncated: boolean;
}

/**
 * Summarises an audit value for table display. Long values (e.g. full HTML
 * template bodies) are collapsed to a single line with a `…` suffix and marked
 * `truncated` so the UI can offer an expand action — this is what stops the
 * config "Recent Changes" table from dumping entire template HTML into the
 * old/new columns.
 */
export function summarizeAuditValue(
  value: unknown,
  maxLength: number = AUDIT_VALUE_MAX_LENGTH,
): AuditValueSummary {
  const full = serializeAuditValue(value);
  if (full.length === 0) return { summary: "—", full, truncated: false };
  if (full.length <= maxLength) return { summary: full, full, truncated: false };

  const singleLine = full.replace(/\s+/g, " ").trim();
  const summary =
    singleLine.length > maxLength
      ? `${singleLine.slice(0, maxLength).trimEnd()}…`
      : singleLine;
  return { summary, full, truncated: true };
}

/** Human label describing the shape of a value (used next to long values). */
export function describeAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string") {
    return `${value.length.toLocaleString()} chars`;
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") {
    try {
      return `${JSON.stringify(value).length.toLocaleString()} bytes`;
    } catch {
      return "object";
    }
  }
  return "scalar";
}