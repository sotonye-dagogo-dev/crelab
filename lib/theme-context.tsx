"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "dark",
  setMode: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("crelab-theme") as ThemeMode) ?? "system";
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setModeState(getStoredMode());
  }, []);

  useEffect(() => {
    const system = getSystemPreference();
    const r = mode === "system" ? system : mode;
    setResolved(r);
    document.documentElement.classList.toggle("light", r === "light");
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      if (mode === "system") {
        const sys = mq.matches ? "light" : "dark";
        setResolved(sys);
        document.documentElement.classList.toggle("light", sys === "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("crelab-theme", newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
