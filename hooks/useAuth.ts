"use client";

import { createAuthClient } from "better-auth/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const authClient = createAuthClient();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  role: string;
}

export interface GoogleSignInOptions {
  callbackURL?: string;
  newUserCallbackURL?: string;
  errorCallbackURL?: string;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (options?: GoogleSignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<AuthUser | null>;
}

const MOCK_USER: AuthUser = {
  id: "mock-user-1",
  name: "Demo Creator",
  email: "demo@crelab.test",
  emailVerified: true,
  image: null,
  phone: "+234 800 000 0000",
  phoneNumber: "+234 800 000 0000",
  phoneNumberVerified: true,
  role: "PROVIDER",
};

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mockMode = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MOCK_DATA === "true"
    : false;

  useEffect(() => {
    if (mockMode) {
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }
    authClient.getSession().then((session) => {
      if (session?.data?.user) {
        setUser(session.data.user as unknown as AuthUser);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [mockMode]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (mockMode) {
      setUser(MOCK_USER);
      return;
    }
    const result = await authClient.signIn.email({ email, password });
    if (result.data?.user) {
      setUser(result.data.user as unknown as AuthUser);
    }
    if (result.error) {
      throw new Error(result.error.message || result.error.statusText || "Sign in failed");
    }
  }, [mockMode]);

  const signInWithGoogle = useCallback(async (options?: GoogleSignInOptions) => {
    if (mockMode) {
      setUser(MOCK_USER);
      return;
    }
    await authClient.signIn.social({
      provider: "google",
      callbackURL: options?.callbackURL,
      newUserCallbackURL: options?.newUserCallbackURL,
      errorCallbackURL: options?.errorCallbackURL,
    });
  }, [mockMode]);

  const signOut = useCallback(async () => {
    if (mockMode) {
      setUser(null);
      return;
    }
    await authClient.signOut();
    setUser(null);
    router.refresh();
  }, [router, mockMode]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      let userResult: AuthUser | null = null;

      if (mockMode) {
        const mockUser = { ...MOCK_USER, name, email };
        setUser(mockUser);
        userResult = mockUser;
      } else {
        const result = await authClient.signUp.email({ name, email, password });
        if (result.data?.user) {
          const u = result.data.user as unknown as AuthUser;
          setUser(u);
          userResult = u;
        }
        if (result.error) {
          throw new Error(result.error.message || result.error.statusText || "Sign up failed");
        }
      }

      if (userResult) {
        fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userResult.email, name: userResult.name }),
        }).catch(() => {});
      }

      return userResult;
    },
    [mockMode],
  );

  return { user, isAuthenticated: !!user, isLoading, signIn, signInWithGoogle, signOut, signUp };
}
