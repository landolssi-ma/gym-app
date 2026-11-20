import Image from "next/image"
import Link from "next/link"

import type { ContentSection, Image as CmsImage, Source } from "@workspace/cms"
import { t } from "@workspace/i18n"

import { MarketingShell } from "../marketing-shell"
import { PageFrame, ContentCta } from "./page-parts"

export function ArticleLayout({
  title,
  description,
  category,
  minutes,
  backHref,
  backLabel,
  image,
  imageCredit,
  sections,
  sources,
  children,
  related,
}: {
  title: string
  description: string
  category: string
  minutes: number
  backHref: string
  backLabel: string
  image?: CmsImage
  imageCredit?: Source
  sections: readonly ContentSection[]
  sources: readonly Source[]
  children?: React.ReactNode
  related?: React.ReactNode
}) {
  return (
    <MarketingShell>
      <PageFrame>
        <Link
          href={backHref}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          ← {backLabel}
        </Link>
        <header className="mt-8 max-w-reading reveal-on-scroll">
          <p className="font-mono text-caption font-medium tracking-widest text-brand-hover uppercase">
            {category} · {t("blogPage.minutes", { count: minutes })}
          </p>
          <h1 className="mt-4 animate-reveal text-section leading-(--leading-title) font-bold tracking-(--tracking-heading) text-balance motion-reduce:animate-none">
            {title}
          </h1>
          <p className="mt-5 max-w-175 animate-reveal font-sans text-lg leading-(--leading-body) text-muted-foreground motion-reduce:animate-none">
            {description}
          </p>
        </header>
        {image && (
          <figure className="mt-8 max-w-reading reveal-on-scroll">
            <div className="aspect-video overflow-hidden rounded-panel border border-border bg-background">
              <Image
                unoptimized
                src={image.src}
                alt={image.alt || title}
                width={image.width}
                height={image.height}
                fetchPriority="high"
                className="h-full w-full object-cover object-top"
              />
            </div>
            {imageCredit && (
              <figcaption className="mt-2 text-xs text-muted-foreground">
                <a
                  href={imageCredit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {imageCredit.label} ↗
                </a>
              </figcaption>
            )}
          </figure>
        )}
        <div className="mt-12 flex items-start gap-10">
          <aside className="sticky top-40 hidden w-48 shrink-0 lg:block">
            <p className="mb-4 font-mono text-caption font-semibold tracking-widest text-muted-foreground uppercase">
              {t("blogPage.onThisPage")}
            </p>
            <nav aria-label={t("blogPage.onThisPage")} className="space-y-3">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm leading-normal text-muted-foreground hover:text-foreground hover:underline"
                >
                  {s.heading}
                </a>
              ))}
            </nav>
          </aside>
          <article className="max-w-180 min-w-0 flex-1">
            <details className="mb-8 rounded-lg border border-border bg-background p-4 lg:hidden">
              <summary className="font-semibold">{t("blogPage.onThisPage")}</summary>
              <nav aria-label={t("blogPage.contents")} className="mt-3 space-y-2">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm hover:underline"
                  >
                    {s.heading}
                  </a>
                ))}
              </nav>
            </details>
            {children}
            {sections.map((s) => (
              <section
                id={s.id}
                key={s.id}
                className="mb-9 reveal-on-scroll scroll-mt-40"
              >
                <h2 className="text-2xl leading-(--leading-interface) font-bold tracking-tight">
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-4 font-sans text-base leading-(--leading-source)">
                  {s.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {s.bullets && (
                    <ul className="list-disc space-y-2 pl-5">
                      {s.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
            <section className="mt-10 border-t border-border pt-6">
              <h2 className="text-lg font-bold">{t("blogPage.sources")}</h2>
              <ul className="mt-3 space-y-3">
                {sources.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline decoration-border-strong/40 hover:decoration-brand"
                    >
                      {s.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </div>
        {related}
        <ContentCta />
      </PageFrame>
    </MarketingShell>
  )
}
