import { cn } from "@workspace/ui/lib/utils"

export function WorkspaceHeading({
  title,
  accent,
  description,
  className,
}: {
  title: string
  accent?: string
  description?: string
  className?: string
}) {
  const index = accent ? title.lastIndexOf(accent) : -1
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="font-heading text-3xl leading-(--leading-interface) font-bold tracking-tight sm:text-4xl">
        {index < 0 || !accent ? (
          title
        ) : (
          <>
            {title.slice(0, index)}
            <span className="inline-block -rotate-2 rounded-badge bg-brand-hover px-2 py-0.5 text-brand-foreground">
              {accent}
            </span>
            {title.slice(index + accent.length)}
          </>
        )}
      </h2>
      {description && (
        <p className="max-w-180 text-sm leading-(--leading-body) text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
