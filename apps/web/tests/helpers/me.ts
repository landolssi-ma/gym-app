import type { Me } from "@/features/auth"

export function meBody(over: Partial<Me> = {}): Me {
  return {
    user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", image: null },
    isAdmin: false,
    impersonating: false,
    hasPassword: false,
    profileComplete: true,
    ...over,
  }
}
