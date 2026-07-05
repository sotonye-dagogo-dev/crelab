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
  signUp: (name: string, email: string, password: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.user) {
        setUser(session.data.user as unknown as AuthUser);
      }
      setIsLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.data?.user) {
      setUser(result.data.user as unknown as AuthUser);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    router.refresh();
  }, [router]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.data?.user) {
        setUser(result.data.user as unknown as AuthUser);
      }
    },
    [],
  );

  return { user, isAuthenticated: !!user, isLoading, signIn, signOut, signUp };
}
