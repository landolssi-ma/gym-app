import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { UsersList } from "@/features/backoffice"

export default function Page() {
  return (
    <>
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("backoffice.navUsers")}</h1>
      <FeatureBoundary skeleton={<Skeleton className="h-80 w-full" />}>
        <UsersList />
      </FeatureBoundary>
    </>
  )
}
