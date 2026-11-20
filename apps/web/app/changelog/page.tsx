import { t } from "@workspace/i18n"

import { ContentCta, PageFrame, PageIntro } from "@/components/marketing/content/page-parts"
import { JsonLd } from "@/components/marketing/json-ld"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { getCms, getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/changelog", t("changelogPage.title"), t("changelogPage.metaDescription"))

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" })

export default async function ChangelogPage() {
  const entries = await getCms().getChangelogEntries()
  const crumbs = getSeo().buildBreadcrumbListJsonLd([
    { name: t("marketing.homeCrumb"), path: "/" },
    { name: t("changelogPage.title"), path: "/changelog" },
  ])
  return (
    <MarketingShell>
      <JsonLd data={crumbs} />
      <PageFrame>
        <PageIntro eyebrow={t("changelogPage.eyebrow")} title={t("changelogPage.title")}>
          <p>{t("changelogPage.intro")}</p>
        </PageIntro>
        <div className="mt-10 max-w-reading space-y-8">
          {entries.map((entry) => (
            <section key={`${entry.date}-${entry.title}`} className="reveal-on-scroll rounded-panel border border-border bg-background p-6">
              <time dateTime={entry.date} className="font-mono text-caption text-brand-hover uppercase">
                {dateFormat.format(new Date(entry.date))}
              </time>
              <h2 className="mt-3 reveal-on-scroll text-2xl">{entry.title}</h2>
              {entry.body.map((p) => (
                <p key={p} className="mt-4 reveal-on-scroll text-base leading-(--leading-body)">
                  {p}
                </p>
              ))}
            </section>
          ))}
          {!entries.length && (
            <div className="rounded-panel border border-border bg-background p-8">
              <h2 className="text-xl">{t("changelogPage.empty")}</h2>
            </div>
          )}
        </div>
        <ContentCta />
      </PageFrame>
    </MarketingShell>
  )
}
