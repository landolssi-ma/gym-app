"use client"

import { useState } from "react"

import { QueryClientProvider } from "@tanstack/react-query"

import { t } from "@workspace/i18n"
import { Toaster } from "@workspace/ui/components/toast"

import { createQueryClient } from "@/lib/query-client"

export function Providers({ children }: { children: React.ReactNode }) {
  // Lazy useState initializer so the client is created once per mount, not on every render --
  // the standard TanStack Query Next.js App Router pattern.
  const [queryClient] = useState(() => createQueryClient())
  return <QueryClientProvider client={queryClient}>{children}<Toaster closeLabel={t("common.dismiss")} /></QueryClientProvider>
}
