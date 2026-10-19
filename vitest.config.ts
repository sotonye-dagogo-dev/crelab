import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Next.js uses the automatic JSX runtime; mirror it so component files
  // (which don't `import React`) transform correctly under vitest.
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});