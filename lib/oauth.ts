export const OAUTH_CALLBACK_URL = "/register?oauth=done";
export const OAUTH_NEW_USER_CALLBACK_URL = "/register?oauth=done&new=1";
export const OAUTH_ERROR_CALLBACK_URL = "/register?oauth=error";

export const SELF_ASSIGNABLE_ROLES = ["CLIENT", "PROVIDER"] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export function isSelfAssignableRole(value: unknown): value is SelfAssignableRole {
  return (
    typeof value === "string" &&
    (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

export function isOAuthCallbackDone(params: URLSearchParams | Record<string, string | null>): boolean {
  return getParam(params, "oauth") === "done";
}

export function isNewOAuthUser(params: URLSearchParams | Record<string, string | null>): boolean {
  return getParam(params, "oauth") === "done" && getParam(params, "new") === "1";
}

export function isOAuthError(params: URLSearchParams | Record<string, string | null>): boolean {
  return getParam(params, "oauth") === "error";
}

export function resolvePostSignupRoute(role: string | undefined, returnTo?: string | null): string {
  if (role === "PROVIDER") return "/profile/setup";
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return "/explore";
}

function getParam(params: URLSearchParams | Record<string, string | null>, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  return params[key] ?? null;
}
