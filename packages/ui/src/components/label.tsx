import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// Plain <label>: the radix Label primitive only blocks double-click text selection, not worth a client bundle.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-bold select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
