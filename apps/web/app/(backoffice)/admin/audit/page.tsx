import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { AuditLog } from "@/features/backoffice"

export default async function Page({ searchParams }: { searchParams: Promise<{ actorId?: string; action?: string }> }) {
  const { actorId, action } = await searchParams
  return (
    <>
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("backoffice.navAudit")}</h1>
      <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
        <AuditLog initial={{ actorId, action }} />
      </FeatureBoundary>
    </>
  )
}
