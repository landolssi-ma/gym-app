export const meKeys = {
  all: ["me"] as const,
  detail: () => [...meKeys.all, "detail"] as const,
}
