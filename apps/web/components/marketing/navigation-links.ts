import { t } from "@workspace/i18n"

export type MarketingLink = { href: string; label: string }

// The marketing header, mobile menu and footer read these. A product adds its pages here.
export const PRIMARY_LINKS: readonly MarketingLink[] = [
  { href: "/#how-it-works", label: t("marketing.navHowItWorks") },
  { href: "/blog", label: t("marketing.navBlog") },
  { href: "/changelog", label: t("marketing.navChangelog") },
]

export const FOOTER_COLUMNS: readonly { title: string; links: readonly MarketingLink[] }[] = [
  { title: t("marketing.footerProduct"), links: [PRIMARY_LINKS[0]!, PRIMARY_LINKS[2]!] },
  { title: t("marketing.footerResources"), links: [PRIMARY_LINKS[1]!, { href: "/help", label: t("marketing.navHelp") }, { href: "/contact", label: t("marketing.navContact") }] },
  { title: t("marketing.footerCompany"), links: [{ href: "/terms", label: t("marketing.navTerms") }, { href: "/privacy", label: t("marketing.navPrivacy") }] },
]
