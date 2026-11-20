/**
 * A feature's index.ts is the only public surface another feature or apps/web/app may import
 * from -- never its ./keys, ./services, or ./hooks directly, and never reaching into another
 * feature's internals. The "@/features/star/star" glob (see the pattern below) matches any path
 * with a segment after the feature name (e.g. @/features/projects/hooks) while leaving
 * @/features/projects itself (the barrel) unrestricted. A dev-time lint rule, not a runtime
 * control -- bypassable with an inline disable comment, same posture as every other project
 * lint rule.
 *
 * @type {import("eslint").Linter.Config}
 */
export const featureBoundaryRules = {
  files: ["**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        // The two negated entries exempt a feature's own components/** subtree (screen
        // components imported directly by their owning route) -- only hooks/services/keys-style
        // internal modules stay restricted to the barrel. Both the bare "components" entry and
        // the "components/**" entry are required: this matcher (the "ignore" package ESLint's
        // no-restricted-imports uses internally) applies gitignore's directory-cascade rule,
        // where a "!"-negated child path has no effect unless the directory itself is negated
        // first.
        patterns: [
          {
            group: ["@/features/*/*", "!@/features/*/components", "!@/features/*/components/**"],
            message: "Import another feature only through its index.ts.",
          },
        ],
      },
    ],
  },
}
