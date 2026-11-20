import { notFound } from "next/navigation"

import { t } from "@workspace/i18n"
import { OG_SIZE } from "@workspace/seo/og"

import { getCms } from "@/lib/cms"
import { ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = t("blogPage.heading")

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getCms().getArticleBySlug((await params).slug)
  if (!article) notFound()
  return ogImage({ eyebrow: t("blogPage.heading"), title: article.title })
}
