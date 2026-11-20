import { Loader2Icon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

// Decorative: always paired with visible text, which carries the status (UI-SPEC Global Rules 10).
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      aria-hidden
      className={cn("size-4 animate-spin text-current motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Spinner }
