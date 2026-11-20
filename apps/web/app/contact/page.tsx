import Link from "next/link"

import { t } from "@workspace/i18n"

import { MarketingShell } from "@/components/marketing/marketing-shell"
import { site } from "@/config/site"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/contact", t("contactPage.heading"), t("contactPage.subhead"))

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 sm:pt-16">
        <h1 className="font-heading text-display font-bold text-balance">{t("contactPage.heading")}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{t("contactPage.subhead")}</p>
        <a href={`mailto:${site.supportEmail}`} className="self-start text-lg font-bold underline decoration-2 underline-offset-4">
          {site.supportEmail}
        </a>
        <p className="text-base text-muted-foreground">
          {t("contactPage.helpPrompt")}{" "}
          <Link href="/help" className="underline underline-offset-4">
            {t("helpPage.heading")}
          </Link>
        </p>
      </div>
    </MarketingShell>
  )
}
