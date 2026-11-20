import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const PHONES = ["left", "right", "center"] as const

// The phones show a neutral screen until the product supplies screenshots.
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
          <div
            className="group/fan relative mt-9 h-115 w-110 flex-none max-wide:scale-86 max-content:-mb-19.5 max-content:origin-top max-content:scale-80 max-fan:-mb-32.5 max-fan:scale-66"
            aria-label={t("marketing.heroScreensLabel")}
          >
            {PHONES.map((position) => (
              <a
                href="#how-it-works"
                key={position}
                className={cn(
                  "absolute top-1/2 left-1/2 z-2 -mt-43.5 -ml-[calc(var(--spacing)*20.625)] h-87 w-41.25",
                  position === "left" &&
                    "z-1 -translate-x-29.5 translate-y-2 scale-89 -rotate-9",
                  position === "right" &&
                    "z-1 translate-x-29.5 translate-y-2 scale-89 rotate-9",
                  position === "center" && "z-3 -translate-y-3"
                )}
                aria-label={t("marketing.heroScreenLabel")}
              >
                <div
                  className={cn(
                    "h-full motion-reduce:animate-none",
                    position === "left"
                      ? "animate-float-slow group-hover/fan:animation-paused"
                      : position === "right"
                        ? "animate-float-slower group-hover/fan:animation-paused"
                        : "animate-float"
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-device bg-forest p-1.5 shadow-[8px_9px_0_var(--pop)] transition-transform duration-620 ease-(--ease-out)",
                      position === "left" &&
                        "shadow-[8px_9px_0_var(--sky)] group-hover/fan:-translate-x-6.25 group-hover/fan:-translate-y-2 group-hover/fan:-rotate-5",
                      position === "right" &&
                        "shadow-[8px_9px_0_var(--blush)] group-hover/fan:translate-x-6.25 group-hover/fan:-translate-y-2 group-hover/fan:rotate-5"
                    )}
                  >
                    <span
                      className="absolute top-3 left-1/2 z-4 h-1.25 w-13.75 -translate-x-1/2 rounded-full bg-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="flex h-full flex-col gap-2.5 overflow-hidden rounded-screen bg-card px-3.5 pt-8" aria-hidden="true">
                      <div className="h-24 rounded-lg bg-secondary" />
                      <div className="h-3 w-3/4 rounded-full bg-border" />
                      <div className="h-3 w-full rounded-full bg-border" />
                      <div className="h-3 w-2/3 rounded-full bg-border" />
                      <div className="mt-2 h-9 rounded-lg bg-primary" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
            <div className="absolute -top-2 -left-7.5 z-5 -rotate-9 rounded-lg border-2 border-border-strong bg-card px-4 py-3.25 shadow-[5px_5px_0_var(--butter)] [&_small]:block [&_small]:font-mono [&_small]:text-tiny [&_small]:leading-(--leading-natural) [&_small]:font-medium [&_small]:text-muted-foreground [&_span]:ml-2 [&_span]:text-compact [&_span]:font-bold [&_strong]:my-1 [&_strong]:inline-block [&_strong]:text-3xl [&_strong]:leading-normal [&_strong]:tracking-(--tracking-title) [&_strong]:text-brand-hover">
              <small>{t("marketing.fanLiftLabel")}</small>
              <strong>{t("marketing.fanLiftValue")}</strong>
              <span>{t("marketing.fanLiftUnit")}</span>
              <small>{t("marketing.fanLiftSource")}</small>
            </div>
            <div className="absolute -right-8.5 -bottom-10 z-5 rotate-4 rounded-lg border-2 border-border-strong bg-forest px-4 py-3.25 text-forest-foreground shadow-[6px_6px_0_var(--pop)]">
              <strong className="text-title-lg tracking-(--tracking-stat) text-butter">
                {t("marketing.fanSpeedValue")}
              </strong>
              <small className="mt-1 block font-heading text-caption leading-(--leading-natural) font-medium text-forest-foreground">
                {t("marketing.fanSpeedLabel")}
              </small>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3.5 border-y border-border px-5 py-6 max-compact:gap-2.5">
        <span className="font-mono text-caption leading-(--leading-natural) font-medium tracking-(--tracking-caption) text-muted-foreground uppercase max-compact:w-full max-compact:text-center">
          {t("marketing.stripLabel")}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border-(length:--border-width-fine) border-border-strong px-3.5 py-1.75 text-compact font-bold shadow-[2px_2px_0_var(--pop)] nth-of-type-3:shadow-[2px_2px_0_var(--sky)] nth-of-type-4:shadow-[2px_2px_0_var(--butter)] max-compact:px-2.5">
          <span aria-hidden="true">♧</span>
          {t("marketing.strip1")}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border-(length:--border-width-fine) border-border-strong px-3.5 py-1.75 text-compact font-bold shadow-[2px_2px_0_var(--pop)] nth-of-type-3:shadow-[2px_2px_0_var(--sky)] nth-of-type-4:shadow-[2px_2px_0_var(--butter)] max-compact:px-2.5">
          <span aria-hidden="true">&lt;/&gt;</span>
          {t("marketing.strip2")}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border-(length:--border-width-fine) border-border-strong px-3.5 py-1.75 text-compact font-bold shadow-[2px_2px_0_var(--pop)] nth-of-type-3:shadow-[2px_2px_0_var(--sky)] nth-of-type-4:shadow-[2px_2px_0_var(--butter)] max-compact:px-2.5">
          <span aria-hidden="true">↗</span>
          {t("marketing.strip3")}
        </span>
      </div>
    </section>
  )
}
