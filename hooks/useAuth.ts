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

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
      if (mockMode) {
        const mockUser = { ...MOCK_USER, name, email };
        setUser(mockUser);
        return mockUser;
      }
      const result = await authClient.signUp.email({ name, email, password });
      if (result.data?.user) {
        setUser(result.data.user as unknown as AuthUser);
      }
      return result.data?.user ? (result.data.user as unknown as AuthUser) : null;
    },
    [mockMode],
  );

  return { user, isAuthenticated: !!user, isLoading, signIn, signOut, signUp };
}
