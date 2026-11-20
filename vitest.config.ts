import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  // apps/web's tsconfig sets jsx: "preserve" (nextjs base) -- without this, a .tsx test file
  // under apps/web/tests fails to parse.
  oxc: { jsx: { runtime: "automatic" } },
  // Root runs include apps/web suites, whose feature modules use its tsconfig's @/* alias.
  resolve: { alias: { "@": fileURLToPath(new URL("./apps/web", import.meta.url)) } },
  test: {
    include: [
      "packages/*/tests/**/*.test.ts",
      "packages/*/tests/**/*.test.tsx",
      "apps/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.tsx",
      "tooling/scripts/tests/**/*.test.ts",
    ],
    environment: "node",
    // A run with no test files yet (early scaffold) is not a failure.
    passWithNoTests: true,
  },
})
