import { cn } from "@workspace/ui/lib/utils"

import { site } from "@/config/site"

function Wordmark({
  size,
  className,
}: {
  size: "header" | "display"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.25 font-heading font-bold tracking-(--tracking-heading) whitespace-nowrap",
        size === "display" ? "text-display leading-normal" : "text-title-sm",
        className
      )}
    >
      <span
        className="inline-flex size-7 items-center justify-center rounded-control bg-forest text-butter"
        aria-hidden="true"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 6v8a7 7 0 0 0 14 0V6M9 6v8a3 3 0 0 0 6 0v-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="15" cy="6" r="1.25" fill="currentColor" />
        </svg>
      </span>
      <span>{site.name}</span>
    </span>
  )
}

export { Wordmark }
