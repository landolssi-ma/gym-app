import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function PageFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-marketing px-(--page-gutter) py-12 md:py-16",
        className
      )}
    >
      {children}
    </div>
  )
}
export function PageIntro({
  eyebrow,
  title,
  children,
  compact = false,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="max-w-reading">
      <p className="mb-4 animate-reveal font-mono text-caption leading-normal font-semibold tracking-widest text-brand-hover uppercase motion-reduce:animate-none">
        {eyebrow}
      </p>
      <h1
        className={cn(
          "animate-reveal [animation-delay:var(--delay-stagger)] text-section leading-(--leading-heading) tracking-(--tracking-heading) text-balance motion-reduce:animate-none",
          compact && "text-app-display leading-(--leading-interface)"
        )}
      >
        {title}
      </h1>
      <div className="mt-5 max-w-175 animate-reveal [animation-delay:calc(var(--delay-stagger)*2)] text-base leading-(--leading-body) text-muted-foreground motion-reduce:animate-none md:text-lg">
        {children}
      </div>
    </div>
  )
}
export function ContentCta({
  title = t("marketing.contentCtaHeading"),
  children = t("marketing.contentCtaBody"),
}: {
  title?: string
  children?: React.ReactNode
}) {
  return (
    <section className="mt-16 reveal-on-scroll rounded-band bg-forest p-7 text-forest-foreground md:p-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-150">
          <h2 className="text-2xl leading-(--leading-interface) font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-base leading-(--leading-body) text-forest-foreground/80">
            {children}
          </p>
        </div>
        <Button
          variant="marketing"
          size="marketing"
          className="shrink-0 bg-butter text-forest hover:bg-butter-soft"
          asChild
        >
          <Link href="/sign-in?mode=signup">
            {t("marketing.heroCta")} <span aria-hidden>→</span>
          </Link>
        </Button>
      </div>
    </section>
  )
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 font-mono text-caption font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  )
}
