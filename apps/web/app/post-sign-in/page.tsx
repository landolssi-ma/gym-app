import { redirect } from "next/navigation"

import { getMeResult } from "@/lib/api-server"

import { safeNext } from "../sign-in/safe-next"

export default async function PostSignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next)
  const result = await getMeResult()
  if (!result.ok) redirect("/dashboard")
  redirect(result.data.profileComplete ? (next ?? "/dashboard") : "/onboarding")
}
