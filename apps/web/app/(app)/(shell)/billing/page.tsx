import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { AppShell } from "@/components/shell/app-shell"

import { BillingDashboard } from "./billing-dashboard"

export const metadata: Metadata = { title: t("billing.title") }

export default function BillingPage() {
  return (
    <AppShell title={t("billing.title")} subtitle={t("billing.subtitle")}>
      <FeatureBoundary skeleton={<Skeleton className="mx-auto h-96 w-full max-w-180" />}>
        <BillingDashboard />
      </FeatureBoundary>
    </AppShell>
  )
}
