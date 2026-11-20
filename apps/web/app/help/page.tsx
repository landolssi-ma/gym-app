import Link from "next/link"

import { t } from "@workspace/i18n"

import { MarketingShell } from "@/components/marketing/marketing-shell"
import { site } from "@/config/site"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/help", t("helpPage.heading"), t("helpPage.subhead"))

const CATEGORIES = ([1, 2, 3, 4] as const).map((i) => ({ heading: t(`helpPage.category${i}Heading`), body: t(`helpPage.category${i}Body`) }))

export default function HelpPage() {
  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-display font-bold text-balance">{t("helpPage.heading")}</h1>
          <p className="max-w-prose text-base text-muted-foreground">{t("helpPage.subhead")}</p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <li key={category.heading} className="flex flex-col gap-2">
              <h2 className="font-heading text-lg font-bold">{category.heading}</h2>
              <p className="text-base text-muted-foreground">{category.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <p className="text-base text-muted-foreground">{t("helpPage.contactPrompt")}</p>
          <a href={`mailto:${site.supportEmail}`} className="text-sm font-bold underline decoration-2 underline-offset-4">
            {t("helpPage.contactCta")}
          </a>
          <Link href="/contact" className="text-sm underline underline-offset-4">
            {t("contactPage.heading")}
          </Link>
        </div>
      </div>
    </MarketingShell>
  )
}
