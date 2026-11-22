import Image from "next/image"
import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function Hero() {
  return (
    <section
      id="start"
      className="relative paper-dots before:pointer-events-none before:absolute before:top-36 before:left-[calc(50%_-_var(--spacing)*165)] before:size-9 before:rounded-full before:bg-sky before:content-[''] after:pointer-events-none after:absolute after:top-126 after:left-[calc(50%_-_var(--spacing)*155)] after:size-20 after:rounded-full after:bg-butter after:content-[''] max-content:before:hidden max-content:after:top-55 max-content:after:right-7 max-content:after:left-auto max-content:after:size-13"
      aria-labelledby="hero-title"
    >
      <div className="mx-auto flex max-w-hero items-center gap-12 px-(--page-gutter) pt-11 pb-14 max-wide:gap-6 max-content:flex-col max-content:gap-5 max-content:pt-8 max-content:pb-11 max-content:text-center">
        <div className="relative z-1 max-w-145 min-w-0 flex-[1_1_calc(var(--spacing)*120)] max-content:w-full max-content:max-w-full max-content:flex-none">
          <Link
            href="/sign-in?mode=signup"
            className="mb-6 inline-flex animate-reveal items-center gap-2.5 rounded-full border-(length:--border-width-fine) border-border-strong bg-butter-soft py-1.5 pr-1.5 pl-3.5 text-compact font-semibold shadow-brand motion-reduce:animate-none max-compact:min-h-12 max-compact:gap-2 max-compact:text-xs max-compact:leading-normal"
          >
            <span className="font-mono text-tiny tracking-widest text-brand-hover max-compact:text-micro">
              {t("marketing.promoTag")}
            </span>
            <span>{t("marketing.promoBody")}</span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs leading-normal whitespace-nowrap text-primary-foreground">
              {t("marketing.promoChip")}
            </span>
          </Link>
          <h1
            id="hero-title"
            className="m-0 animate-reveal text-display leading-(--leading-display) font-bold tracking-(--tracking-display) text-balance [animation-delay:var(--delay-stagger)] motion-reduce:animate-none max-content:text-display-mobile max-content:leading-none max-content:tracking-(--tracking-heading) max-fan:text-[length:var(--type-display-min)]"
          >
            {t.rich("marketing.heroHeadline", { highlight: (c) => <span className="text-brand-hover">{c}</span> })}
          </h1>
          <p className="mt-5.5 max-w-125 animate-reveal text-subtitle leading-normal text-muted-foreground [animation-delay:calc(var(--delay-stagger)*2)] motion-reduce:animate-none max-content:mx-auto">
            {t.rich("marketing.heroSubhead", { strong: (c) => <strong className="text-foreground">{c}</strong> })}
          </p>
          <div className="mt-7 max-w-125 animate-reveal motion-reduce:animate-none max-content:mx-auto">
            <p className="mb-2.25 font-mono text-xs leading-normal font-bold text-brand-hover">{t("marketing.heroCtaLabel")}</p>
            <Button variant="marketing" size="marketing" className="mt-3 w-full px-3 py-4.5" asChild>
              <Link href="/sign-in?mode=signup">
                {t("marketing.heroCta")} <span aria-hidden="true">→</span>
              </Link>
            </Button>
          </div>
          <div className="mt-5.5 max-w-125 max-content:mx-auto">
            <p className="mb-3 font-mono text-caption leading-(--leading-natural) font-medium text-muted-foreground">
              {t("marketing.reviewLabel")}
            </p>
            <div className="grid grid-cols-2 gap-3 max-content:grid-cols-1">
              {[1, 2].map((i) => (
                <figure
                  key={i}
                  className="m-0 flex min-h-42.5 animate-reveal flex-col rounded-xl border border-border-strong bg-card px-3.75 py-3.5 text-left shadow-[4px_4px_0_var(--pop)] nth-2:shadow-[4px_4px_0_var(--butter)] motion-reduce:animate-none max-content:min-h-auto max-content:nth-2:hidden max-compact:p-4.5"
                >
                  <span
                    className="mb-2.25 block text-xs leading-normal tracking-(--tracking-symbols) text-brand-hover"
                    aria-label={t("marketing.reviewStars")}
                  >
                    ★★★★★
                  </span>
                  <blockquote className="m-0 text-compact leading-(--leading-review) font-semibold">
                    {t(i === 1 ? "marketing.review1" : "marketing.review2")}
                  </blockquote>
                  <figcaption className="mt-auto pt-3 text-tiny text-muted-foreground">
                    {t(
                      i === 1
                        ? "marketing.review1Author"
                        : "marketing.review2Author"
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-1 flex min-w-0 flex-[1_1_calc(var(--spacing)*95)] animate-reveal items-center justify-center motion-reduce:animate-none max-content:mt-3 max-content:w-full max-content:flex-none">
          <div className="relative w-full max-w-lg">
            {/* Decorative background blob */}
            <div className="absolute inset-0 -z-1 rounded-3xl bg-beige" aria-hidden="true" />
            {/* Leaf decorations */}
            <svg viewBox="0 0 120 180" className="absolute -top-6 -right-4 -z-1 w-28 opacity-40 text-sage" fill="currentColor" aria-hidden="true">
              <ellipse cx="60" cy="90" rx="30" ry="80" transform="rotate(-20 60 90)" />
              <ellipse cx="60" cy="90" rx="15" ry="70" transform="rotate(-20 60 90)" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <svg viewBox="0 0 120 180" className="absolute -bottom-4 -left-6 -z-1 w-20 opacity-30 text-sage" fill="currentColor" aria-hidden="true">
              <ellipse cx="60" cy="90" rx="28" ry="75" transform="rotate(15 60 90)" />
            </svg>
            {/* Hero photo */}
            <Image
              src="/hero-couple.png"
              alt="Two athletes — a man and a woman — back to back, smiling"
              width={890}
              height={610}
              priority
              className="relative z-1 w-full rounded-2xl object-cover"
            />
            {/* "Stronger Together" overlay */}
            <div className="absolute right-5 top-5 z-2 text-right" aria-hidden="true">
              <p className="font-heading text-2xl italic font-bold leading-tight text-charcoal drop-shadow-sm">
                Stronger<br />Together
              </p>
            </div>
            {/* Stat badges */}
            <div className="absolute -bottom-4 -left-4 z-2 -rotate-3 rounded-xl border-2 border-border-strong bg-card px-4 py-3 shadow-[4px_4px_0_var(--butter)]">
              <small className="block font-mono text-tiny font-semibold uppercase tracking-widest text-muted-foreground">{t("marketing.fanLiftLabel")}</small>
              <strong className="text-2xl font-bold tracking-tight text-brand-hover">{t("marketing.fanLiftValue")}</strong>
              <span className="ml-1.5 text-sm font-semibold text-muted-foreground">{t("marketing.fanLiftUnit")}</span>
            </div>
            <div className="absolute -right-4 -bottom-4 z-2 rotate-2 rounded-xl border-2 border-border-strong bg-sage px-4 py-3 shadow-[4px_4px_0_var(--pop)]">
              <strong className="text-2xl font-bold tracking-tight text-white">{t("marketing.fanSpeedValue")}</strong>
              <small className="mt-0.5 block font-heading text-xs font-semibold text-white/80">{t("marketing.fanSpeedLabel")}</small>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3.5 border-y border-border px-5 py-6 max-compact:gap-2.5">
        <span className="font-mono text-caption leading-(--leading-natural) font-medium tracking-(--tracking-caption) text-muted-foreground uppercase max-compact:w-full max-compact:text-center">
          {t("marketing.stripLabel")}
        </span>
        {([
          { key: "strip1", icon: "⊛" },
          { key: "strip2", icon: "✦" },
          { key: "strip3", icon: "△" },
          { key: "strip4", icon: "◎" },
        ] as const).map(({ key, icon }, i) => (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border-(length:--border-width-fine) border-border-strong px-3.5 py-1.75 text-compact font-bold max-compact:px-2.5",
              i === 0 && "shadow-[2px_2px_0_var(--pop)]",
              i === 1 && "shadow-[2px_2px_0_var(--sky)]",
              i === 2 && "shadow-[2px_2px_0_var(--butter)]",
              i === 3 && "shadow-[2px_2px_0_var(--blush)]",
            )}
          >
            <span aria-hidden="true">{icon}</span>
            {t(`marketing.${key}` as Parameters<typeof t>[0])}
          </span>
        ))}
      </div>
    </section>
  )
}
