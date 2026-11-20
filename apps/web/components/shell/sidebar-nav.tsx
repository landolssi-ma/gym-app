"use client"

import { usePathname } from "next/navigation"

import { t } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

import type { NavItem } from "@/config/nav"

// Only this list needs the client-side pathname, for highlighting the active item.
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname?.startsWith(href + "/")
        return (
          <a
            key={href}
            href={href}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-forest text-forest-foreground shadow-[2px_2px_0_var(--border-strong)]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" />
            {t(label)}
          </a>
        )
      })}
    </nav>
  )
}
