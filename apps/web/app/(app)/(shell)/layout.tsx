import { redirect } from "next/navigation"

import { t } from "@workspace/i18n"

import { FeatureBoundary } from "@/components/feature-error"
import { ShellSidebar } from "@/components/shell/shell-sidebar"
import { Wordmark } from "@/components/wordmark"
import { OnboardingGate } from "@/features/billing"
import { site } from "@/config/site"
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
  // /api/me keeps answering for a suspended workspace so this state can render; the sidebar and its
  // switcher stay, so the member can switch to another workspace.
  const suspended = result.data.activeOrganization.suspended
  return (
    <div className="flex min-h-dvh bg-card">
      <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col gap-5 overflow-y-auto border-r border-border-strong bg-sidebar px-3 py-4 xl:flex">
        <a href="/dashboard" aria-label={t("common.homeLabel")}>
          <Wordmark size="header" className="text-lg" />
        </a>
        <FeatureBoundary skeleton={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <ShellSidebar />
        </FeatureBoundary>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col dotted-grid">
        {suspended ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <p className="max-w-md text-lg font-bold">{t("app.organizationSuspended", { supportEmail: site.supportEmail })}</p>
            <div className="xl:hidden">
              <FeatureBoundary skeleton={null}>
                <ShellSidebar />
              </FeatureBoundary>
            </div>
          </div>
        ) : (
          // /api/me is already in the query cache (seeded by the (app) layout), so this never suspends.
          <OnboardingGate>{children}</OnboardingGate>
        )}
      </div>
    </div>
  )
}
