"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { t } from "@workspace/i18n"
import { Building2Icon, CreditCardIcon, FileTextIcon, UsersIcon } from "@workspace/ui/components/icons"
import { cn } from "@workspace/ui/lib/utils"

// The backoffice's own chrome: it shares nothing with the customer app's sidebar.
const NAV_ITEMS = [
  { href: "/admin", match: "/admin/users", label: t("backoffice.navUsers"), Icon: UsersIcon },
  { href: "/admin/organizations", match: "/admin/organizations", label: t("backoffice.navWorkspaces"), Icon: Building2Icon },
  { href: "/admin/subscriptions", match: "/admin/subscriptions", label: t("backoffice.navSubscriptions"), Icon: CreditCardIcon },
  { href: "/admin/audit", match: "/admin/audit", label: t("backoffice.navAudit"), Icon: FileTextIcon },
] as const

export function BackofficeNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname() ?? ""
  return (
    <nav aria-label={t("backoffice.title")} className={cn("flex gap-1", mobile ? "flex-wrap" : "flex-col")}>
      {NAV_ITEMS.map(({ href, match, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(match)
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold", active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
