export const billingKeys = {
  all: ["billing"] as const,
  detail: () => [...billingKeys.all, "detail"] as const,
}
