"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { useMe } from "@/features/auth"

// Pages a workspace without a live subscription can still open.
const ALWAYS_OPEN = ["/billing", "/settings", "/team"]

// Routing only: product routes also answer 402 without a live subscription.
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data } = useMe()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const blocked = !data.live && !ALWAYS_OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    if (blocked) router.replace("/plans")
  }, [blocked, router])

  return blocked ? null : children
}
