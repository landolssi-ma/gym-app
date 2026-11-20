import { redirect } from "next/navigation"

import { getMeResult } from "@/lib/api-server"

import { safeNext } from "../sign-in/safe-next"

// Where every sign-in without a return path lands: the first unfinished step for the active
// workspace. A live workspace (including one the user just joined by invitation) skips the funnel.
export default async function PostSignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next)
  const result = await getMeResult()
  // A failed read lands on a shell page, whose layout shows the right screen.
  if (!result.ok) redirect("/dashboard")
  const { live, onboarding } = result.data
  if (live) redirect(next ?? "/dashboard")
  redirect(onboarding?.completedAt ? "/plans" : "/onboarding")
}
