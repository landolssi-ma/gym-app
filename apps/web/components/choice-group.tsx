"use client"

import { Button } from "@workspace/ui/components/button"

export type ChoiceOption = { value: string; label: string; description?: string }

// A single-select control built from Button. `optional` lets the selected option be clicked again
// to clear it, for questions that may stay unanswered.
export function ChoiceGroup({
  label,
  options,
  value,
  optional = false,
  onChange,
}: {
  label: string
  options: ChoiceOption[]
  value: string | null
  optional?: boolean
  onChange: (value: string | null) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <Button
            key={opt.value}
            type="button"
            variant={selected ? "secondary" : "ghost"}
            role="radio"
            aria-checked={selected}
            className="h-auto w-full items-start gap-3 py-2 text-left whitespace-normal"
            onClick={() => onChange(optional && selected ? null : opt.value)}
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border"
            >
              {selected && <span className="size-2.5 rounded-full bg-primary" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 break-words">
              <span>{opt.label}</span>
              {opt.description && <span className="text-sm font-normal text-muted-foreground">{opt.description}</span>}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
