import type { useRouter } from "next/navigation"

import { signOut } from "@workspace/auth/client"

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

// Accounts created by an emailed code start without a real name.
export const displayName = (name: string, email: string) => name.trim() || email.split("@")[0]!

export async function signOutAndRedirect(router: ReturnType<typeof useRouter>) {
  await signOut()
  router.replace("/sign-in")
}
