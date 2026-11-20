import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"

export function SectionHeading({
  eyebrow,
  title,
  children,
  centered = false,
  compact = false,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
  centered?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn("max-w-190", centered && "text-center")}>
      <p
        className={cn(
          "flex reveal-on-scroll items-center gap-2 font-mono text-tiny leading-(--leading-eyebrow) font-bold tracking-widest uppercase before:size-4 before:rounded-swatch before:border before:border-forest before:bg-(--section-swatch,var(--pop)) before:shadow-[1.5px_1.5px_0_var(--forest)] before:content-['']",
          centered && "justify-center"
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-4 reveal-on-scroll text-section leading-(--leading-heading) tracking-(--tracking-heading) text-balance",
          compact && "text-section-compact leading-(--leading-heading)"
        )}
      >
        {title}
      </h2>
      {children && (
        <p className="mt-4.5 max-w-160 reveal-on-scroll text-lg leading-(--leading-body) text-muted-foreground max-md:text-base max-md:leading-(--leading-body)">
          {children}
        </p>
      )}
    </div>
  )
}

export function MarketingCta({
  children,
  hint,
  href = "/sign-in?mode=signup",
}: {
  children: React.ReactNode
  hint?: string
  href?: string
}) {
  return (
    <div className="mt-10 flex reveal-on-scroll flex-col items-center gap-3">
      <Button variant="marketing" size="marketing" asChild>
        <Link href={href}>
          {children} <span aria-hidden="true">→</span>
        </Link>
      </Button>
      {hint && (
        <small className="text-compact text-muted-foreground">{hint}</small>
      )}
    </div>
  )
}
