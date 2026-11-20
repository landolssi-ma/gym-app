import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"

import { BlogDirectory } from "@/components/marketing/content/blog-directory"
import { PageFrame } from "@/components/marketing/content/page-parts"
import { JsonLd } from "@/components/marketing/json-ld"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { getCms, getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/blog", t("blogPage.heading"), t("blogPage.metaDescription"))

export default async function BlogPage() {
  const articles = await getCms().getArticles()
  const crumbs = getSeo().buildBreadcrumbListJsonLd([
    { name: t("marketing.homeCrumb"), path: "/" },
    { name: t("blogPage.heading"), path: "/blog" },
  ])
  return (
    <MarketingShell>
      <JsonLd data={crumbs} />
      <PageFrame>
        <div className="grid gap-7 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 animate-reveal font-mono text-caption tracking-widest text-muted-foreground uppercase">{t("blogPage.heading")}</p>
            <h1 className="max-w-145 animate-reveal text-display leading-(--leading-heading) tracking-(--tracking-heading) text-balance [animation-delay:var(--delay-stagger)]">
              {t("blogPage.title")}
            </h1>
          </div>
          <div className="max-w-110 md:ml-auto">
            <p className="animate-reveal font-sans text-lg leading-(--leading-body) text-muted-foreground [animation-delay:calc(var(--delay-stagger)*2)]">{t("blogPage.intro")}</p>
            <div className="mt-5 flex animate-reveal flex-wrap gap-3 [animation-delay:calc(var(--delay-stagger)*3)]">
              <Button asChild className="rounded-full bg-forest shadow-none">
                <Link href="/sign-in?mode=signup">{t("marketing.heroCta")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href="#latest">{t("blogPage.browse")}</a>
              </Button>
            </div>
          </div>
        </div>
        <BlogDirectory articles={articles} />
      </PageFrame>
    </MarketingShell>
  )
}
