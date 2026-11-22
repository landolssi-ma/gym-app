import { redirect } from "next/navigation"

import { t } from "@workspace/i18n"

import { FeatureBoundary } from "@/components/feature-error"
import { ShellSidebar } from "@/components/shell/shell-sidebar"
import { Wordmark } from "@/components/wordmark"
import { getMeResult, isSignedInFresh } from "@/lib/api-server"

// The persistent sidebar. In the layout (not AppShell) so it stays mounted across navigations;
// only its /api/me-dependent part waits, behind its own boundary.
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const result = await getMeResult()
  if (!result.ok) {
    // To sign-in only when the sign-in page agrees the visitor is signed out, so the two can never
    // send a browser back and forth; any other refusal reaches app/error.tsx.
    if (!(await isSignedInFresh())) redirect("/sign-in")
    throw new Error(`GET /api/me failed: ${result.status}`)
  }
  if (!result.data.profileComplete) redirect("/onboarding")
  return (
    <div className="flex min-h-dvh bg-ivory">
      <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col gap-5 overflow-y-auto border-r border-border-strong bg-beige px-3 py-4 xl:flex">
        <a href="/dashboard" aria-label={t("common.homeLabel")}>
          <Wordmark size="header" className="text-lg" />
        </a>
        <FeatureBoundary skeleton={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <ShellSidebar />
        </FeatureBoundary>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col dotted-grid">
        {children}
      </div>
    </div>
  )
}
