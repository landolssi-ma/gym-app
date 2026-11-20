import { t } from "@workspace/i18n"

import { LegalDocument } from "@/components/marketing/content/legal-document"
import { JsonLd } from "@/components/marketing/json-ld"
import { site } from "@/config/site"
import { getCms, getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/privacy", t("legal.privacyHeading"), t("legal.privacyMetaDescription"))

export default async function PrivacyPage() {
  const doc = await getCms().getLegalDocument("privacy")
  const crumbs = getSeo().buildBreadcrumbListJsonLd([
    { name: t("marketing.homeCrumb"), path: "/" },
    { name: t("legal.privacyHeading"), path: "/privacy" },
  ])
  return (
    <>
      <JsonLd data={crumbs} />
      <LegalDocument title={t("legal.privacyHeading")} intro={t("legal.privacyIntro")} sections={doc?.sections ?? []}>
        <section id="contact" className="scroll-mt-40">
          <h2 className="text-title-sm font-bold">{t("legal.contactHeading")}</h2>
          <p className="mt-3 text-base leading-(--leading-source)">
            {t("legal.contactBody")}{" "}
            <a href={`mailto:${site.supportEmail}`} className="underline">
              {site.supportEmail}
            </a>
          </p>
        </section>
      </LegalDocument>
    </>
  )
}
