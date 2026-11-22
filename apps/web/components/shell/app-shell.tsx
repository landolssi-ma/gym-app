import { cn } from "@workspace/ui/lib/utils"

import { FeatureBoundary } from "../feature-error"

import { ShellHeaderActions } from "./shell-header-actions"

// Each page's header and content area. The sidebar lives in (shell)/layout.tsx so it persists
// across navigations. No data fetching here: the header paints at once and only the user menu
// waits for GET /api/me, behind its own boundary.
export function AppShell({ title, subtitle, actions, children, className }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <>
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-ivory px-5 py-3 lg:px-6">
        <div className="min-w-0">
          <h1 className="font-heading text-base font-bold">{title}</h1>
          {subtitle && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {actions}
          <FeatureBoundary skeleton={<div className="h-9 w-9 animate-pulse rounded-full bg-muted" />}>
            <ShellHeaderActions />
          </FeatureBoundary>
        </div>
      </header>
      <main className={cn("flex-1 p-5 lg:p-6", className)}>{children}</main>
    </>
  )
}
