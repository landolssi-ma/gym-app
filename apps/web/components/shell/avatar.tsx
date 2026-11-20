import { cn } from "@workspace/ui/lib/utils"

import { initials } from "./user-identity"

// The uploaded avatar when there is one, else the person's initials.
export function Avatar({ name, image, className }: { name: string; image: string | null; className?: string }) {
  return image ? (
    // A small square avatar: nothing for next/image to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground", className)} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
