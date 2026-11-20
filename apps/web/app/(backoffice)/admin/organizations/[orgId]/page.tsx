import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { OrganizationDetail } from "@/features/backoffice"

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  return (
    <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
      <OrganizationDetail orgId={orgId} />
    </FeatureBoundary>
  )
}
