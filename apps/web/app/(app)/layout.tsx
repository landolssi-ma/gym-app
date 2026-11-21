import { dehydrate, QueryClient } from "@tanstack/react-query"

import { HydrationBoundary } from "@/components/query-hydration-boundary"
import { Providers } from "@/components/providers"
import { ImpersonationBanner, meKeys } from "@/features/auth"
import { getMeResult } from "@/lib/api-server"

// No server-side guard here: proxy.ts already sends signed-out visitors to sign-in. /api/me is
// seeded into the query cache once, above every (app) route, so client hooks never refetch it on mount.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getMeResult()
  const queryClient = new QueryClient()
  if (result.ok) queryClient.setQueryData(meKeys.detail(), result.data)

  return (
    <Providers>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="tabular-nums [--shadow-hard-sm:2px_2px_0_var(--border)] [--shadow-hard:4px_4px_0_var(--border-strong)] [--sidebar-width:calc(var(--spacing)*56)] [&_.border-2]:border [&_.border-b-2]:border-b [&_.border-l-2]:border-l [&_.border-r-2]:border-r [&_.border-t-2]:border-t [&_.text-tiny]:text-caption">
          <ImpersonationBanner />
          {children}
        </div>
      </HydrationBoundary>
    </Providers>
  )
}
