import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
// Subpath, not the "radix-ui" barrel: the barrel stalls the vinext rsc build.
import * as Slot from "radix-ui/slot"

import { cn } from "@workspace/ui/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-heading text-sm font-bold whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    // size before variant: cva emits classes in key order, so link's px-0 wins over the size padding.
    variants: {
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-xs": "size-7",
        marketing:
          "h-auto max-w-full rounded-lg border-0 px-7 py-3.75 text-center text-base leading-(--leading-natural) whitespace-normal",
      },
      variant: {
        default:
          "press bg-primary text-primary-foreground shadow-brand hover:bg-forest",
        secondary:
          "press border-border bg-card text-foreground hover:bg-accent",
        outline: "press border-input bg-card text-foreground hover:bg-accent",
        destructive: "press bg-destructive text-destructive-foreground",
        ghost: "border-transparent shadow-none hover:bg-accent",
        link: "border-transparent px-0 underline decoration-2 underline-offset-4 shadow-none",
        marketing:
          "bg-primary text-primary-foreground shadow-brand-lg [transition:var(--transition-action)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-forest hover:shadow-brand focus-visible:outline-offset-3 active:translate-x-1 active:translate-y-1 active:shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
