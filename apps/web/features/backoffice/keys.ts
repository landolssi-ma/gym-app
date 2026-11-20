export const backofficeKeys = {
  all: ["backoffice"] as const,
  list: (kind: string, filters: object, cursor?: string) => [...backofficeKeys.all, kind, "list", filters, cursor ?? ""] as const,
  detail: (kind: string, id: string) => [...backofficeKeys.all, kind, "detail", id] as const,
}
