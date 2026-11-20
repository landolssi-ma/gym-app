import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const message = "Use a design token from packages/ui globals.css"
// Attribute/structural variants select a state; they do not define a design value.
// Expressions that reference CSS tokens are valid; literal arbitrary values still fail.
const arbitrary = "/(^|\\s|:)(?!(?:data|aria|has|in|supports|not|group|peer|content|transition)[a-z-]*-\\[)[a-z-]+-\\[(?![^\\]]*(?:var\\(|--))[^\\]]+\\](?!:)/"
const hex = "/#[0-9a-fA-F]{3,8}\\b/"

/**
 * No hex literals or arbitrary Tailwind values in app code (apps/web, packages/ui), so a rebrand
 * is a globals.css edit. The files glob also opts .ts/.tsx into linting (flat config only
 * matches .js by default), and the jsx parser plugin lets the shared Babel parser read TSX.
 * Generated .d.ts files are skipped.
 *
 * @type {import("eslint").Linter.Config}
 */
export const tokenRules = {
  files: ["**/*.{ts,tsx}"],
  ignores: ["**/*.d.ts"],
  languageOptions: {
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        presets: [require.resolve("@babel/preset-typescript")],
        parserOpts: { plugins: ["jsx"] },
      },
    },
  },
  rules: {
    // Babel's scope analysis sees neither JSX nor type-only references, so the base rules flag every
    // used import in TSX and every type name (typescript-eslint turns both off for TS files; tsc
    // already checks undefined names).
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-restricted-syntax": [
      "error",
      { selector: `Literal[value=${arbitrary}]`, message },
      { selector: `Literal[value=${hex}]`, message },
      { selector: `TemplateElement[value.raw=${arbitrary}]`, message },
      { selector: `TemplateElement[value.raw=${hex}]`, message },
    ],
  },
}
