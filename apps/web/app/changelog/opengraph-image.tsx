import { t } from "@workspace/i18n"
import { OG_SIZE } from "@workspace/seo/og"

import { ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = t("changelogPage.title")

export default function Image() {
  return ogImage({ title: t("changelogPage.title") })
}
