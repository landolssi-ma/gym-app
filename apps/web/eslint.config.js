import { featureBoundaryRules } from "@workspace/eslint-config/feature-boundaries"
import { nextJsConfig } from "@workspace/eslint-config/next-js"
import { tokenRules } from "@workspace/eslint-config/tokens"

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: [".wrangler/**", "worker-configuration.d.ts"] },
  ...nextJsConfig,
  tokenRules,
  // config/site.ts holds the email colors: email clients cannot read CSS variables.
  { files: ["config/site.ts"], rules: { "no-restricted-syntax": "off" } },
  featureBoundaryRules,
]
