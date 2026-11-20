import { messages, t } from "@workspace/i18n"

// Every API error code maps to one user-facing message in en.json (errors.<code>); an unknown
// code shows the generic message instead of a raw code.
export function errorMessage(code: unknown): string {
  return typeof code === "string" && code in messages.errors ? t(`errors.${code as keyof typeof messages.errors}`) : t("errors.generic")
}
