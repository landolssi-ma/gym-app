import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { t } from "@workspace/i18n"
import { ArrowLeftIcon } from "@workspace/ui/components/icons"

import { Providers } from "@/components/providers"
import { BackofficeNav } from "@/features/backoffice"
import { callApiInProcess } from "@/lib/api-server"

export const metadata: Metadata = { title: t("backoffice.title"), robots: { index: false, follow: false } }

// The platform admin role is read from the database on every request (requireAdmin behind
// /api/admin/check). Anyone else gets the 404 page: the backoffice is not advertised. The API still
// refuses every backoffice route on its own.
export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  if ((await callApiInProcess("/api/admin/check")).status !== 204) notFound()
  return (
    <Providers>
      <div className="flex min-h-dvh bg-card [&_.border-2]:border [&_.border-b-2]:border-b [&_.border-l-2]:border-l [&_.border-r-2]:border-r [&_.border-t-2]:border-t [--shadow-hard-sm:2px_2px_0_var(--border)]">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col justify-between gap-6 border-r-2 border-border bg-background p-4 md:flex">
          <BackofficeNav />
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
            {t("backoffice.backToApp")}
          </Link>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-5 bg-card dotted-grid p-5 lg:p-6">
          <div className="space-y-3 md:hidden">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
              <ArrowLeftIcon className="size-4" />
              {t("backoffice.backToApp")}
            </Link>
            <BackofficeNav mobile />
          </div>
          {children}
        </main>
      </div>
    </Providers>
  )
}
