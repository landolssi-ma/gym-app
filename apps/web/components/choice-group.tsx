"use client"

import { cn } from "@workspace/ui/lib/utils"

export type ChoiceOption = { value: string; label: string; description?: string; icon?: React.ReactNode }

// Single-select control. layout="grid" renders icon cards in a 2-col grid.
// layout="row" renders compact horizontal chips. `optional` lets the selected
// item be clicked again to clear it.
export function ChoiceGroup({
  label,
  options,
  value,
  optional = false,
  layout = "list",
  onChange,
}: {
  label: string
  options: ChoiceOption[]
  value: string | null
  optional?: boolean
  layout?: "list" | "grid" | "row"
  onChange: (value: string | null) => void
}) {
  if (layout === "grid") {
    return (
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const selected = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optional && selected ? null : opt.value)}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-sage bg-sage/5"
                  : "border-border bg-card hover:border-sage/40 hover:bg-muted/30"
              )}
            >
              {opt.icon && (
                <div className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-sage/15 text-sage" : "bg-muted text-muted-foreground"
                )}>
                  {opt.icon}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-snug">{opt.label}</p>
                {opt.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
                )}
              </div>
              {selected && (
                <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-sage text-white">
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (layout === "row") {
    return (
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optional && selected ? null : opt.value)}
              className={cn(
                "flex size-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                selected
                  ? "border-sage bg-sage text-white"
                  : "border-border bg-card text-foreground hover:border-sage/50"
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  // list layout (default)
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optional && selected ? null : opt.value)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              selected
                ? "border-sage bg-sage/5"
                : "border-border bg-card hover:border-sage/40 hover:bg-muted/30"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selected ? "border-sage" : "border-border"
              )}
            >
              {selected && <span className="size-2.5 rounded-full bg-sage" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 break-words">
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.description && (
                <span className="text-sm font-normal text-muted-foreground">{opt.description}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
