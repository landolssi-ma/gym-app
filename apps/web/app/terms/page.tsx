import { t } from "@workspace/i18n"

import { LegalDocument } from "@/components/marketing/content/legal-document"
import { JsonLd } from "@/components/marketing/json-ld"
import { getCms, getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata = publicMetadata("/terms", t("legal.termsHeading"), t("legal.termsMetaDescription"))

export default async function TermsPage() {
  const doc = await getCms().getLegalDocument("terms")
  const crumbs = getSeo().buildBreadcrumbListJsonLd([
    { name: t("marketing.homeCrumb"), path: "/" },
    { name: t("legal.termsHeading"), path: "/terms" },
  ])
  return (
    <>
      <JsonLd data={crumbs} />
      <LegalDocument title={t("legal.termsHeading")} intro={t("legal.termsIntro")} sections={doc?.sections ?? []} />
    </>
  )
}
