import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// The loading placeholder every loading.tsx and FeatureBoundary skeleton is built from.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />
}

export { Skeleton }
