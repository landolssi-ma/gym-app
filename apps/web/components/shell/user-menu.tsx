"use client"

import { useRouter } from "next/navigation"

import { t } from "@workspace/i18n"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu"
import { ChevronDownIcon } from "@workspace/ui/components/icons"

import { ADMIN_NAV, SETTINGS_NAV } from "@/config/nav"

import { Avatar } from "./avatar"
import { displayName, signOutAndRedirect } from "./user-identity"

export function UserMenu({ name, email, image, isAdmin }: { name: string; email: string; image: string | null; isAdmin: boolean }) {
  const router = useRouter()
  const shown = displayName(name, email)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 transition-colors hover:bg-background">
        <Avatar name={shown} image={image} className="size-7 text-xs" />
        <span className="hidden text-xs font-bold sm:inline">{shown}</span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block font-bold">{shown}</span>
          <span className="block font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {[...SETTINGS_NAV, ...(isAdmin ? [ADMIN_NAV] : [])].map(({ href, label }) => (
          <DropdownMenuItem key={href} asChild>
            <a href={href}>{t(label)}</a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAndRedirect(router)}>{t("common.signOut")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
