import { describe, it, expect } from "vitest";
import {
  OAUTH_CALLBACK_URL,
  OAUTH_NEW_USER_CALLBACK_URL,
  OAUTH_ERROR_CALLBACK_URL,
  SELF_ASSIGNABLE_ROLES,
  isSelfAssignableRole,
  isOAuthCallbackDone,
  isNewOAuthUser,
  isOAuthError,
  resolvePostSignupRoute,
} from "@/lib/oauth";

describe("lib/oauth — OAuth callback constants", () => {
  it("defines the register finalize callback URLs", () => {
    expect(OAUTH_CALLBACK_URL).toBe("/register?oauth=done");
    expect(OAUTH_NEW_USER_CALLBACK_URL).toBe("/register?oauth=done&new=1");
    expect(OAUTH_ERROR_CALLBACK_URL).toBe("/register?oauth=error");
  });

  it("exposes only client/provider as self-assignable roles", () => {
    expect(SELF_ASSIGNABLE_ROLES).toEqual(["CLIENT", "PROVIDER"]);
  });
});

describe("lib/oauth — isSelfAssignableRole", () => {
  it("accepts CLIENT and PROVIDER", () => {
    expect(isSelfAssignableRole("CLIENT")).toBe(true);
    expect(isSelfAssignableRole("PROVIDER")).toBe(true);
  });

  it("rejects ADMIN to prevent privilege escalation", () => {
    expect(isSelfAssignableRole("ADMIN")).toBe(false);
  });

  it("rejects empty, lowercase, and non-string values", () => {
    expect(isSelfAssignableRole("")).toBe(false);
    expect(isSelfAssignableRole("provider")).toBe(false);
    expect(isSelfAssignableRole(undefined)).toBe(false);
    expect(isSelfAssignableRole(null)).toBe(false);
    expect(isSelfAssignableRole(123)).toBe(false);
    expect(isSelfAssignableRole({})).toBe(false);
  });
});

describe("lib/oauth — callback detection helpers", () => {
  it("isOAuthCallbackDone detects the done marker", () => {
    expect(isOAuthCallbackDone(new URLSearchParams("oauth=done"))).toBe(true);
    expect(isOAuthCallbackDone({ oauth: "done" })).toBe(true);
    expect(isOAuthCallbackDone(new URLSearchParams("oauth=error"))).toBe(false);
    expect(isOAuthCallbackDone(new URLSearchParams(""))).toBe(false);
    expect(isOAuthCallbackDone({})).toBe(false);
  });

  it("isNewOAuthUser only returns true for new-user callbacks", () => {
    expect(isNewOAuthUser(new URLSearchParams("oauth=done&new=1"))).toBe(true);
    expect(isNewOAuthUser({ oauth: "done", new: "1" })).toBe(true);
    expect(isNewOAuthUser(new URLSearchParams("oauth=done"))).toBe(false);
    expect(isNewOAuthUser(new URLSearchParams("oauth=done&new=0"))).toBe(false);
    expect(isNewOAuthUser(new URLSearchParams("oauth=error&new=1"))).toBe(false);
  });

  it("isOAuthError detects the error marker", () => {
    expect(isOAuthError(new URLSearchParams("oauth=error"))).toBe(true);
    expect(isOAuthError({ oauth: "error" })).toBe(true);
    expect(isOAuthError(new URLSearchParams("oauth=done"))).toBe(false);
  });
});

describe("lib/oauth — resolvePostSignupRoute", () => {
  it("sends providers to the onboarding wizard", () => {
    expect(resolvePostSignupRoute("PROVIDER", "/somewhere")).toBe("/profile/setup");
  });

  it("sends clients to a safe returnTo when present", () => {
    expect(resolvePostSignupRoute("CLIENT", "/bookings/123")).toBe("/bookings/123");
  });

  it("falls back to /explore for clients without a returnTo", () => {
    expect(resolvePostSignupRoute("CLIENT", null)).toBe("/explore");
    expect(resolvePostSignupRoute("CLIENT", undefined)).toBe("/explore");
    expect(resolvePostSignupRoute(undefined, null)).toBe("/explore");
  });

  it("ignores external and protocol-relative returnTo values (open redirect guard)", () => {
    expect(resolvePostSignupRoute("CLIENT", "https://evil.example")).toBe("/explore");
    expect(resolvePostSignupRoute("CLIENT", "//evil.example")).toBe("/explore");
    expect(resolvePostSignupRoute("CLIENT", "javascript:alert(1)")).toBe("/explore");
  });
});
