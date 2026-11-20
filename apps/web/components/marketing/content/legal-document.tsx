import Link from "next/link"

import type { ContentSection } from "@workspace/cms"
import { t } from "@workspace/i18n"

import { site } from "@/config/site"

import { MarketingShell } from "../marketing-shell"
import { PageFrame } from "./page-parts"

export function LegalDocument({
  title,
  intro,
  updated,
  sections,
  children,
}: {
  title: string
  intro: string
  updated?: string
  sections: readonly ContentSection[]
  children?: React.ReactNode
}) {
  return (
    <MarketingShell>
      <PageFrame>
        <header>
          <h1 className="text-4xl leading-(--leading-interface) tracking-tight">
            {title}
          </h1>
          {updated && (
            <p className="mt-3 text-sm text-muted-foreground">{updated}</p>
          )}
          <p className="mt-5 max-w-180 text-base leading-(--leading-body) text-muted-foreground">
            {intro}
          </p>
        </header>
        <div className="mt-10 flex items-start gap-10">
          <aside className="sticky top-40 hidden w-55 shrink-0 lg:block">
            <p className="mb-4 text-sm font-semibold">{t("blogPage.onThisPage")}</p>
            <nav aria-label={t("blogPage.contents")} className="space-y-2.5">
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
          <article className="max-w-180 min-w-0 flex-1 space-y-8">
            {!sections.length && <p className="font-sans text-base leading-(--leading-source) text-muted-foreground">{t("legal.empty")}</p>}
            {sections.map((s) => (
              <section
                id={s.id}
                key={s.id}
                className="reveal-on-scroll scroll-mt-40"
              >
                <h2 className="text-title-sm leading-normal font-bold">
                  {s.heading}
                </h2>
                {s.paragraphs.map((p) => (
                  <p
                    key={p}
                    className="mt-3 font-sans text-base leading-(--leading-source)"
                  >
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 font-sans text-base leading-(--leading-source)">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {children}
          </article>
        </div>
        <nav
          aria-label={t("legal.otherPolicies")}
          className="mt-12 flex flex-wrap gap-5 border-t border-border pt-5 text-sm text-muted-foreground"
        >
          <Link href="/privacy" className="hover:underline">
            {t("legal.privacyHeading")}
          </Link>
          <Link href="/terms" className="hover:underline">
            {t("legal.termsHeading")}
          </Link>
          <a href={`mailto:${site.supportEmail}`} className="hover:underline">
            {t("marketing.navContact")}
          </a>
        </nav>
      </PageFrame>
    </MarketingShell>
  )
}
