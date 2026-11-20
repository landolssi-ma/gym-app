export const teamKeys = {
  all: ["team"] as const,
  detail: () => [...teamKeys.all, "detail"] as const,
}
