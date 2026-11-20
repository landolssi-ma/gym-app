import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { UserDetail } from "@/features/backoffice"

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return (
    <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
      <UserDetail userId={userId} />
    </FeatureBoundary>
  )
}
