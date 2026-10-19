/**
 * Shared error mapper for booking lifecycle action routes
 * (accept / decline / cancel / start). Keeps status mapping consistent across
 * the routes so a state-machine rejection is always a 400 with the real reason
 * (users need to know *why*), an ownership violation is always a 403, and an
 * unexpected failure is logged server-side but never leaks internals to the
 * client ("error messages must explain what the user can do").
 */

export interface IActionErrorResponse {
  status: number;
  error: string;
}

const OWNERSHIP_PATTERN = /^Only the (client|provider)/i;
const STATE_PATTERN =
  /cannot transition|changed state|must be|no longer awaiting|already|awaiting response|raise a dispute/i;

export function bookingActionErrorResponse(
  err: unknown,
  context?: string,
): IActionErrorResponse {
  const message =
    err instanceof Error && err.message ? err.message : "Something went wrong — please try again.";
  const name = err instanceof Error ? err.name : "";

  if (message === "Unauthorized") return { status: 401, error: "Unauthorized" };
  if (message === "Booking not found") return { status: 404, error: "Booking not found" };

  if (OWNERSHIP_PATTERN.test(message)) {
    return { status: 403, error: message };
  }

  // State-machine rejections (BookingStateError) and the service's guarded
  // messages — all recoverable, all worth showing verbatim.
  if (name === "BookingStateError" || STATE_PATTERN.test(message)) {
    return { status: 400, error: message };
  }

  console.error(
    `[booking-action] ${context ? `${context}: ` : ""}unexpected failure`,
    err,
  );
  return { status: 500, error: "Something went wrong — please try again." };
}
