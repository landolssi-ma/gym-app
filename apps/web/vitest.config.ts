import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Standalone config: Vitest prefers vitest.config.ts over vite.config.ts, so the vinext +
// @cloudflare/vite-plugin plugins in apps/web/vite.config.ts never load here -- those plugins are
// the source of the `__cjs_module_runner_transform` startup error this file exists to avoid.
export default defineConfig({
  // apps/web's tsconfig sets jsx: "preserve" (nextjs base); without this a .tsx test fails to parse.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    // Mirrors tsconfig.json's "@/*": ["./*"] mapping. vinext/Next resolve "@/..." at build time
    // via their own bundler; this standalone config loads neither, so a feature's "@/lib/..."
    // imports need it spelled out here too, or any test that imports such a module fails to resolve.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    passWithNoTests: true,
  },
})
