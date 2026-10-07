import type { CountdownArea, ICountdownWidget } from "@/types";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function isWidgetExpired(widget: ICountdownWidget, nowMs: number): boolean {
  const endsAt = Date.parse(widget.endsAt);
  if (Number.isNaN(endsAt)) return true;
  return endsAt <= nowMs;
}

export function selectWidgetsForArea(
  widgets: ICountdownWidget[],
  area: CountdownArea,
  nowMs?: number,
): ICountdownWidget[] {
  return widgets
    .filter(
      (widget) =>
        !!widget &&
        widget.enabled === true &&
        Array.isArray(widget.areas) &&
        widget.areas.includes(area),
    )
    .filter((widget) => nowMs === undefined || !isWidgetExpired(widget, nowMs))
    .slice()
    .sort(
      (a, b) => a.orderIndex - b.orderIndex || String(a.id).localeCompare(String(b.id)),
    );
}

export function countdownParts(endsAt: string, nowMs: number): CountdownParts {
  const target = Date.parse(endsAt);
  const remaining = Number.isNaN(target) ? 0 : Math.max(0, target - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

export function padUnit(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local-time value for `<input type="datetime-local">`, or "" when unparseable. */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

/** ISO 8601 string from a `datetime-local` value, or "" when unparseable. */
export function fromDatetimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}
