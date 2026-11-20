import { config } from "@workspace/eslint-config/react-internal"
import { tokenRules } from "@workspace/eslint-config/tokens"

/** @type {import("eslint").Linter.Config} */
export default [...config, tokenRules]
